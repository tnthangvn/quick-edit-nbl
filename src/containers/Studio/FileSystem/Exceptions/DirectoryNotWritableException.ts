import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Không có quyền tạo thư mục con trong thư mục cha. */
export class DirectoryNotWritableException extends AppException {
  readonly code = "FILESYSTEM.DIRECTORY_NOT_WRITABLE";
  readonly status = 403;
}
