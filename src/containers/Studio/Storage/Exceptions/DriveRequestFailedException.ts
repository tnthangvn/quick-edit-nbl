import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class DriveRequestFailedException extends AppException {
  readonly code = "STORAGE.DRIVE_REQUEST_FAILED";
  readonly status = 502;
}
