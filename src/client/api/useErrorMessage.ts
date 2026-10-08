"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ErrorParams, ErrorResponse, ValidationErrorResponse } from "@/client/api/generated/model";

/** Lỗi do hàm fetch Orval ném ra khi non-2xx: `err.status` + `err.info` là body lỗi đã có type. */
export type ApiError = Error & { info?: ErrorResponse | ValidationErrorResponse; status?: number };

type ErrorShape = { code: string; params?: ErrorParams; traceId?: string };

const UNEXPECTED = "INTERNAL.UNEXPECTED";

/** next-intl chỉ nhận string | number | Date trong values. */
function toValues(params?: ErrorParams) {
  return Object.fromEntries(Object.entries(params ?? {}).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : v]));
}

/** Lấy `{ code, params, traceId }` từ ApiError, body `{ error }`, `ErrorResponseError` hoặc `FieldError`. */
export function extractApiError(err: unknown): ErrorShape | null {
  if (!err || typeof err !== "object") return null;
  const candidate = "info" in err && err.info ? err.info : err;
  const inner = typeof candidate === "object" && candidate && "error" in candidate ? (candidate as { error: unknown }).error : candidate;
  if (inner && typeof inner === "object" && "code" in inner && typeof inner.code === "string") return inner as ErrorShape;
  return null;
}

/**
 * Dịch lỗi API theo `errors.<DOMAIN>.<REASON>` (next-intl). Mã chưa có bản dịch hoặc lỗi không có mã
 * (mạng, lỗi JS) → `INTERNAL.UNEXPECTED` kèm `traceId` (hoặc "—").
 *
 * ```ts
 * const errorMessage = useErrorMessage();
 * onError: (err) => notify.error(errorMessage(err))
 * ```
 */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return useCallback(
    (err: unknown): string => {
      const e = extractApiError(err);
      const traceId = e?.traceId ?? "—";
      if (e && e.code !== UNEXPECTED && t.has(e.code)) return t(e.code, { traceId, ...toValues(e.params) });
      return t(UNEXPECTED, { traceId });
    },
    [t],
  );
}
