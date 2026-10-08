import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logger } from "@/ship/adapters/logger";
import {
  ERROR_CODES,
  type ErrorCode,
  type ErrorParams,
  type ErrorResponse,
  type ValidationErrorResponse,
} from "@/ship/contracts/errors";
import { AppException } from "@/ship/parents/AppException";

/** Input của request (params / query / body) không qua được schema → 422. */
export class RequestValidationError extends Error {
  constructor(readonly issues: z.core.$ZodIssue[]) {
    super("request validation failed");
  }
}

/** Body không phải JSON hợp lệ → 400. */
export class MalformedJsonError extends Error {}

const isErrorCode = (v: unknown): v is ErrorCode => typeof v === "string" && (ERROR_CODES as readonly string[]).includes(v);

/** Đổi một issue của zod thành mã lỗi field. Issue `custom` có message là ErrorCode thì dùng nguyên mã đó. */
export function issueToFieldError(issue: z.core.$ZodIssue): { code: ErrorCode; params?: ErrorParams } {
  switch (issue.code) {
    case "invalid_type":
      return { code: issue.input === undefined || issue.input === null ? "FIELD.REQUIRED" : "FIELD.INVALID_VALUE" };
    case "too_small":
      if (issue.origin === "string" && Number(issue.minimum) <= 1) return { code: "FIELD.REQUIRED" };
      return { code: "FIELD.TOO_SHORT", params: { min: Number(issue.minimum) } };
    case "too_big":
      return { code: "FIELD.TOO_LONG", params: { max: Number(issue.maximum) } };
    case "invalid_format":
      return { code: "FIELD.INVALID_FORMAT", params: { format: String(issue.format) } };
    case "custom":
      return { code: isErrorCode(issue.message) ? issue.message : "FIELD.INVALID_VALUE", params: issue.params as ErrorParams };
    default:
      return { code: "FIELD.INVALID_VALUE" };
  }
}

const json = (status: number, body: ErrorResponse | ValidationErrorResponse) => Response.json(body, { status });

/** Mọi lỗi từ Controller đi qua đây. Không bao giờ trả câu thông báo hay stack trace ra ngoài. */
export function toErrorResponse(err: unknown): Response {
  const traceId = randomUUID().slice(0, 8);

  if (err instanceof AppException) {
    if (err.status >= 500) logger.error({ err, traceId, code: err.code }, "app exception");
    return json(err.status, { error: { code: err.code, params: err.params, traceId } });
  }

  if (err instanceof RequestValidationError) {
    const fields: ValidationErrorResponse["error"]["fields"] = {};
    for (const issue of err.issues) {
      const key = issue.path.length ? issue.path.join(".") : "_";
      fields[key] ??= issueToFieldError(issue);
    }
    return json(422, { error: { code: "VALIDATION.FAILED", fields, traceId } });
  }

  if (err instanceof MalformedJsonError) {
    return json(400, { error: { code: "REQUEST.MALFORMED_JSON", traceId } });
  }

  logger.error({ err, traceId }, "unexpected error");
  return json(500, { error: { code: "INTERNAL.UNEXPECTED", traceId } });
}
