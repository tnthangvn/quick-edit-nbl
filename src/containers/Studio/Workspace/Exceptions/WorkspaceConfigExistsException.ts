import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceConfigExistsException extends AppException {
  readonly code = "WORKSPACE.CONFIG_EXISTS";
  readonly status = 409;
}
