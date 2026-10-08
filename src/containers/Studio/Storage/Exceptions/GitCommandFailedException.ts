import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class GitCommandFailedException extends AppException {
  readonly code = "STORAGE.GIT_COMMAND_FAILED";
  readonly status = 502;
}
