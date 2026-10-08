import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceFolderNotFoundException extends AppException {
  readonly code = "WORKSPACE.FOLDER_NOT_FOUND";
  readonly status = 404;
}
