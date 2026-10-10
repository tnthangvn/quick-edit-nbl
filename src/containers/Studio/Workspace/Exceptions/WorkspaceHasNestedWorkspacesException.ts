import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Thư mục chứa Workspace khác đang có trong danh sách: xoá sẽ mất luôn workspace đó. params.paths. */
export class WorkspaceHasNestedWorkspacesException extends AppException {
  readonly code = "WORKSPACE.HAS_NESTED_WORKSPACES";
  readonly status = 409;
}
