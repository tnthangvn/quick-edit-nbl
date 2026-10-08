import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceDriveAccessDeniedException extends AppException {
  readonly code = "WORKSPACE.DRIVE_ACCESS_DENIED";
  readonly status = 403;
}
