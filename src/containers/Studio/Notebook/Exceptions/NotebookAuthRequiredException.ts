import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class NotebookAuthRequiredException extends AppException {
  readonly code = "NOTEBOOK.AUTH_REQUIRED";
  readonly status = 401;
}
