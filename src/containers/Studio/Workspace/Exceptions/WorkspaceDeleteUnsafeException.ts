import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Từ chối xoá thư mục không an toàn (gốc hệ thống, home, dữ liệu app, symlink, không phải thư mục workspace...). params.reason. */
export class WorkspaceDeleteUnsafeException extends AppException {
  readonly code = "WORKSPACE.DELETE_UNSAFE";
  readonly status = 409;
}
