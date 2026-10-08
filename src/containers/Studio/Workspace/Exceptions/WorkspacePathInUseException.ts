import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspacePathInUseException extends AppException {
  readonly code = "WORKSPACE.PATH_IN_USE";
  readonly status = 409;
}
