import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class NotebookNotFoundException extends AppException {
  readonly code = "NOTEBOOK.NOT_FOUND";
  readonly status = 404;
}
