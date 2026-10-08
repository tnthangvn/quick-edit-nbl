import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceDriveNotConfiguredException extends AppException {
  readonly code = "WORKSPACE.DRIVE_NOT_CONFIGURED";
  readonly status = 400;
}
