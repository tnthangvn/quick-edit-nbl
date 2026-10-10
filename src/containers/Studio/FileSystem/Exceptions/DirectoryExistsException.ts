import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Đã có file / thư mục cùng tên trong thư mục cha. */
export class DirectoryExistsException extends AppException {
  readonly code = "FILESYSTEM.DIRECTORY_EXISTS";
  readonly status = 409;
}
