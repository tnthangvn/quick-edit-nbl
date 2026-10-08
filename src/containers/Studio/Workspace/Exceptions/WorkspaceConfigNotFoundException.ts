import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceConfigNotFoundException extends AppException {
  readonly code = "WORKSPACE.CONFIG_NOT_FOUND";
  readonly status = 404;
}
