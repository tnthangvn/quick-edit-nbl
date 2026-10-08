import { describe, expect, it } from "vitest";
import { extractApiError } from "@/client/api/useErrorMessage";

describe("extractApiError", () => {
  it("đọc ApiError của Orval (err.info.error)", () => {
    const err = Object.assign(new Error("x"), { status: 404, info: { error: { code: "WORKSPACE.NOT_FOUND", traceId: "t1" } } });
    expect(extractApiError(err)).toEqual({ code: "WORKSPACE.NOT_FOUND", traceId: "t1" });
  });
  it("đọc FieldError trực tiếp", () => {
    expect(extractApiError({ code: "FIELD.REQUIRED" })).toEqual({ code: "FIELD.REQUIRED" });
  });
  it("lỗi không có mã → null", () => {
    expect(extractApiError(new TypeError("Failed to fetch"))).toBeNull();
  });
});
