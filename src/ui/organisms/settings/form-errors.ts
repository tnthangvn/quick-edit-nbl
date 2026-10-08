"use client";

import { get, type FieldErrors, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import type { ErrorCode, ErrorParams, FieldError as ApiFieldError } from "@/client/api/generated/model";
import { extractApiError, type ApiError } from "@/client/api/useErrorMessage";

/**
 * Lỗi form dùng chung một dạng với lỗi field của API (`FieldError { code, params }`), để `Field` dịch theo
 * `errors.FIELD.*` dù lỗi đến từ zod phía client hay từ `VALIDATION.FAILED` của server.
 * - Client: `zodResolver(Schema, apiErrorMap)` → message của RHF là JSON `{ code, params }` (cùng quy tắc với BE).
 * - Server: `applyServerFieldErrors(err, setError)` gán `fields` vào đúng field của form.
 */
type RawIssue = { code?: string; origin?: string; minimum?: unknown; maximum?: unknown; format?: unknown; input?: unknown; message?: string; params?: unknown };

function issueToFieldError(issue: RawIssue): ApiFieldError {
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
      return { code: (issue.message as ErrorCode | undefined) ?? "FIELD.INVALID_VALUE", params: issue.params as ErrorParams | undefined };
    default:
      return { code: "FIELD.INVALID_VALUE" };
  }
}

/** Tham số thứ hai của `zodResolver`: mã hoá mỗi issue thành `FieldError` của API. */
export const apiErrorMap = {
  error: (issue: RawIssue) => JSON.stringify(issueToFieldError(issue)),
};

/** Đọc lỗi tại `path` của form thành `FieldError` cho `Field`. */
export function fieldError<T extends FieldValues>(errors: FieldErrors<T>, path: string): ApiFieldError | null {
  const e = get(errors, path) as { message?: string; type?: string } | undefined;
  if (!e) return null;
  if (e.message) {
    try {
      const parsed = JSON.parse(e.message) as ApiFieldError;
      if (parsed && typeof parsed.code === "string") return parsed;
    } catch {
      // không phải JSON → coi như lỗi giá trị
    }
  }
  return { code: "FIELD.INVALID_VALUE" };
}

const PREFIX = /^(body|query|params)\./;

/**
 * Lỗi 422 `VALIDATION.FAILED`: gán từng `fields[key]` vào field cùng đường dẫn (bỏ tiền tố `body.`).
 * `map` đổi tên khoá server → đường dẫn form khi khác nhau. Trả `true` nếu đã gán ít nhất một lỗi.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  map: (key: string) => string | null = (k) => k,
): boolean {
  const info = (err as ApiError | undefined)?.info;
  const fields = info && "error" in info && info.error && "fields" in info.error ? info.error.fields : undefined;
  if (!fields) return false;
  let applied = false;
  for (const [rawKey, fe] of Object.entries(fields)) {
    const key = map(rawKey.replace(PREFIX, ""));
    if (!key) continue;
    setError(key as Path<T>, { type: "server", message: JSON.stringify(fe) }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}

/** Lỗi API có mã `code` không. */
export function hasErrorCode(err: unknown, code: ErrorCode): boolean {
  return extractApiError(err)?.code === code;
}
