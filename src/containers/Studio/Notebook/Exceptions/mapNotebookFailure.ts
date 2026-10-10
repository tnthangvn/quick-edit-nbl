import "server-only";
import { NotebookLmError } from "@/ship/adapters/notebooklm";
import { NotebookAuthRequiredException } from "./NotebookAuthRequiredException";
import { NotebookCommandFailedException } from "./NotebookCommandFailedException";
import { NotebookCredentialsMissingException } from "./NotebookCredentialsMissingException";
import { NotebookNotFoundException } from "./NotebookNotFoundException";

/** NotebookLmError của adapter → exception có mã (chi tiết kỹ thuật ở params.detail, không chứa cookie). Lỗi khác giữ nguyên. */
export function notebookFailure(err: unknown): unknown {
  if (!(err instanceof NotebookLmError)) return err;
  switch (err.kind) {
    case "NO_CREDENTIALS":
      return new NotebookCredentialsMissingException();
    case "AUTH":
      return new NotebookAuthRequiredException(err.detail ? { detail: err.detail } : undefined);
    case "NOT_FOUND":
      return new NotebookNotFoundException();
    default:
      return new NotebookCommandFailedException(err.detail ? { detail: err.detail } : undefined);
  }
}
