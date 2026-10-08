import "server-only";
import type { ErrorCode, ErrorParams } from "@/ship/contracts/errors";

/**
 * Lỗi nghiệp vụ có mã. BE không trả câu thông báo, FE dịch theo `code`.
 *
 *   export class SpecNotFoundException extends AppException {
 *     readonly code = "SPEC.NOT_FOUND";
 *     readonly status = 404;
 *   }
 *   throw new SpecNotFoundException({ file });
 */
export abstract class AppException extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;

  constructor(
    readonly params?: ErrorParams,
    options?: { cause?: unknown },
  ) {
    super(undefined, options);
    this.name = new.target.name;
  }
}

export class NotFoundException extends AppException {
  readonly code = "RESOURCE.NOT_FOUND";
  readonly status = 404;
}

export class ConflictException extends AppException {
  readonly code = "RESOURCE.CONFLICT";
  readonly status = 409;
}
