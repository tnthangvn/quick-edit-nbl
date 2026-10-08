import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceDriveDownloadFailedException extends AppException {
  readonly code = "WORKSPACE.DRIVE_DOWNLOAD_FAILED";
  readonly status = 502;
}
