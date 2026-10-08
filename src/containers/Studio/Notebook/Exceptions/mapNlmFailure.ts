import "server-only";
import { NlmError } from "@/ship/adapters/nlm";
import { NotebookAuthRequiredException } from "./NotebookAuthRequiredException";
import { NotebookCliNotFoundException } from "./NotebookCliNotFoundException";
import { NotebookCommandFailedException } from "./NotebookCommandFailedException";
import { NotebookNotFoundException } from "./NotebookNotFoundException";

/** NlmError của adapter → exception có mã (thông báo gốc của nlm đặt ở params.detail). Lỗi khác giữ nguyên. */
export function nlmFailure(err: unknown): unknown {
  if (!(err instanceof NlmError)) return err;
  switch (err.kind) {
    case "NOT_INSTALLED":
      return new NotebookCliNotFoundException();
    case "AUTH":
      return new NotebookAuthRequiredException();
    case "NOT_FOUND":
      return new NotebookNotFoundException();
    default:
      return new NotebookCommandFailedException(err.detail ? { detail: err.detail } : undefined);
  }
}
