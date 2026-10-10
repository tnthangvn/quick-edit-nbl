import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Xoá thư mục trên máy phải gửi kèm confirm = "delete". */
export class WorkspaceDeleteNotConfirmedException extends AppException {
  readonly code = "WORKSPACE.DELETE_NOT_CONFIRMED";
  readonly status = 400;
}
