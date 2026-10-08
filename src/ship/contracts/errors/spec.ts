/** Mã lỗi của domain SPEC. Chỉ container sở hữu domain này được sửa file. Dạng "SPEC.REASON". */
export const SPEC_ERROR_CODES = [
  "SPEC.NOT_FOUND",
  "SPEC.ALREADY_EXISTS",
  "SPEC.INVALID_NAME",
  "SPEC.PATH_OUTSIDE_WORKSPACE",
  "SPEC.SPECS_DIR_NOT_FOUND",
] as const;
