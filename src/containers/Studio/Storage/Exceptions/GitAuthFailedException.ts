import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class GitAuthFailedException extends AppException {
  readonly code = "STORAGE.GIT_AUTH_FAILED";
  readonly status = 401;
}
