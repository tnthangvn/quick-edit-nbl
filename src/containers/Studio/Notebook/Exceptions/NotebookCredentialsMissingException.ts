import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Chưa dán cookie NotebookLM (Settings › Integrations hoặc secret NOTEBOOK_COOKIE của Workspace). */
export class NotebookCredentialsMissingException extends AppException {
  readonly code = "NOTEBOOK.CREDENTIALS_MISSING";
  readonly status = 401;
}
