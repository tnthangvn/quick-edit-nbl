import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class DriveNotFoundException extends AppException {
  readonly code = "STORAGE.DRIVE_NOT_FOUND";
  readonly status = 404;
}
