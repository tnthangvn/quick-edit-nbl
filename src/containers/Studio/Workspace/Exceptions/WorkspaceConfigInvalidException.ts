import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceConfigInvalidException extends AppException {
  readonly code = "WORKSPACE.CONFIG_INVALID";
  readonly status = 409;
}
