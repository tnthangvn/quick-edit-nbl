import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceAlreadyRegisteredException extends AppException {
  readonly code = "WORKSPACE.ALREADY_REGISTERED";
  readonly status = 409;
}
