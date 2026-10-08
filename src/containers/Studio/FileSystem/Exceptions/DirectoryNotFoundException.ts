import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class DirectoryNotFoundException extends AppException {
  readonly code = "FILESYSTEM.DIRECTORY_NOT_FOUND";
  readonly status = 404;
}
