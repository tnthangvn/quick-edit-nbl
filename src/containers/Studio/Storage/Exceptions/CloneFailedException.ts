import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class CloneFailedException extends AppException {
  readonly code = "STORAGE.CLONE_FAILED";
  readonly status = 502;
}
