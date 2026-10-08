"use client";

import { useTranslations } from "next-intl";
import type { ErrorParams, FieldError } from "@/client/api/generated/model";

/** next-intl chỉ nhận string | number | Date trong values: đổi boolean sang chuỗi. */
function toValues(params?: ErrorParams) {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : v]));
}

/**
 * Dịch lỗi hiển thị trong molecule (Field, SyncTargetRow): `FieldError` / `PublishStepError` → `errors.<code>`,
 * chuỗi đã dịch thì giữ nguyên. Mã chưa có bản dịch → `INTERNAL.UNEXPECTED`.
 * (Lỗi API bất kỳ ở organism/page: dùng `useErrorMessage` trong `@/client/api/useErrorMessage`.)
 */
export function useErrorText(error: FieldError | string | null | undefined): string | null {
  const t = useTranslations("errors");
  if (!error) return null;
  if (typeof error === "string") return error;
  return t.has(error.code) ? t(error.code, toValues(error.params)) : t("INTERNAL.UNEXPECTED", { traceId: "—" });
}
