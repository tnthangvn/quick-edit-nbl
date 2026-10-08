import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class NotebookCommandFailedException extends AppException {
  readonly code = "NOTEBOOK.COMMAND_FAILED";
  readonly status = 502;
}
