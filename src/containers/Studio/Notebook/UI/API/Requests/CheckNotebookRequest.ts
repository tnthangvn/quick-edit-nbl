import { z } from "zod";
import { SyncStrategy } from "@/ship/contracts/enums/sync";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { NotebookCheckResponse } from "../Transformers/NotebookTransformer";

/** Notebook ID hoặc URL notebook (tự tách ID). */
const NotebookIdInput = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .transform((v) => v.match(/notebook\/([\w-]+)/)?.[1] ?? v)
  .pipe(z.string().regex(/^[\w-]+$/, "FIELD.INVALID_FORMAT"));

export const checkNotebookContract = defineContract({
  request: {
    params: z.object({ workspaceId: z.string().min(1) }),
    body: z
      .object({
        notebookId: NotebookIdInput.optional().meta({ description: "Bỏ trống = notebook đã cấu hình của Workspace" }),
        syncStrategy: SyncStrategy.optional(),
      })
      .default({})
      .meta({ id: "CheckNotebookBody" }),
  },
  responses: { 200: NotebookCheckResponse, 401: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse, 502: ErrorResponse, 503: ErrorResponse },
});
