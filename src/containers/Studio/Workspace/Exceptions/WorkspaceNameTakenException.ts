import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceNameTakenException extends AppException {
  readonly code = "WORKSPACE.NAME_TAKEN";
  readonly status = 409;
}
