import { z } from "zod";
import { AGENT_ERROR_CODES } from "./agent";
import { CONNECTOR_ERROR_CODES } from "./connector";
import { CORE_ERROR_CODES } from "./core";
import { FILESYSTEM_ERROR_CODES } from "./filesystem";
import { NOTEBOOK_ERROR_CODES } from "./notebook";
import { PUBLISH_ERROR_CODES } from "./publish";
import { SETTING_ERROR_CODES } from "./setting";
import { SPEC_ERROR_CODES } from "./spec";
import { STORAGE_ERROR_CODES } from "./storage";
import { WORKSPACE_ERROR_CODES } from "./workspace";

/**
 * Toàn bộ mã lỗi BE có thể trả. FE dịch theo mã (next-intl, khoá errors.<DOMAIN>.<REASON>).
 * Thêm mã mới: sửa file domain tương ứng trong thư mục này + thêm bản dịch ở messages/<locale>/errors.json.
 */
export const ERROR_CODES = [
  ...CORE_ERROR_CODES,
  ...WORKSPACE_ERROR_CODES,
  ...SPEC_ERROR_CODES,
  ...SETTING_ERROR_CODES,
  ...CONNECTOR_ERROR_CODES,
  ...FILESYSTEM_ERROR_CODES,
  ...STORAGE_ERROR_CODES,
  ...NOTEBOOK_ERROR_CODES,
  ...PUBLISH_ERROR_CODES,
  ...AGENT_ERROR_CODES,
] as const;

export const ErrorCode = z.enum(ERROR_CODES).meta({ id: "ErrorCode", description: "Mã lỗi dạng DOMAIN.REASON" });
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorParams = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .meta({ id: "ErrorParams", description: "Giá trị chèn vào bản dịch; không chứa câu thông báo" });
export type ErrorParams = z.infer<typeof ErrorParams>;

export const FieldError = z.object({ code: ErrorCode, params: ErrorParams.optional() }).meta({ id: "FieldError" });

export const ErrorResponse = z
  .object({
    error: z.object({
      code: ErrorCode,
      params: ErrorParams.optional(),
      traceId: z.string().optional(),
    }),
  })
  .meta({ id: "ErrorResponse" });
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const ValidationErrorResponse = z
  .object({
    error: z.object({
      code: z.literal("VALIDATION.FAILED"),
      fields: z.record(z.string(), FieldError),
      traceId: z.string().optional(),
    }),
  })
  .meta({ id: "ValidationErrorResponse" });
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponse>;
