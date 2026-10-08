import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceNotFoundException extends AppException {
  readonly code = "WORKSPACE.NOT_FOUND";
  readonly status = 404;
}
