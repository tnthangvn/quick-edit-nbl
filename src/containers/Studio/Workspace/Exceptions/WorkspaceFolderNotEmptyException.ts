import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceFolderNotEmptyException extends AppException {
  readonly code = "WORKSPACE.FOLDER_NOT_EMPTY";
  readonly status = 409;
}
