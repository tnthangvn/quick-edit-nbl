import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceFolderNotWritableException extends AppException {
  readonly code = "WORKSPACE.FOLDER_NOT_WRITABLE";
  readonly status = 400;
}
