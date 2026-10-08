import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class NotebookCliNotFoundException extends AppException {
  readonly code = "NOTEBOOK.CLI_NOT_FOUND";
  readonly status = 503;
}
