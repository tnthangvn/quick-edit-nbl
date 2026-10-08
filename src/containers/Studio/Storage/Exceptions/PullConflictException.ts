import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class PullConflictException extends AppException {
  readonly code = "STORAGE.PULL_CONFLICT";
  readonly status = 409;
}
