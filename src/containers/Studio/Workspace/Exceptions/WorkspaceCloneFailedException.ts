import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceCloneFailedException extends AppException {
  readonly code = "WORKSPACE.CLONE_FAILED";
  readonly status = 502;
}
