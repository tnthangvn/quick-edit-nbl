import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Máy chưa có user.name / user.email cho Git: app không tự đặt tác giả thay người dùng. */
export class GitIdentityMissingException extends AppException {
  readonly code = "STORAGE.GIT_IDENTITY_MISSING";
  readonly status = 409;
}
