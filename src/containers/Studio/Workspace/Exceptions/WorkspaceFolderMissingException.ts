import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceFolderMissingException extends AppException {
  readonly code = "WORKSPACE.FOLDER_MISSING";
  readonly status = 409;
}
