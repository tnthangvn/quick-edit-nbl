import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class NotebookNotConfiguredException extends AppException {
  readonly code = "NOTEBOOK.NOT_CONFIGURED";
  readonly status = 409;
}
