import "server-only";
import { z } from "zod";

export const NotebookCheckResponse = z
  .object({
    notebookId: z.string(),
    /** false: notebook không tồn tại hoặc tài khoản (cookie) không có quyền. */
    ok: z.boolean(),
    sourceCount: z.number().int().nonnegative().nullable(),
    title: z.string().nullable(),
  })
  .meta({ id: "NotebookCheckResult" });

export const NotebookConnectionResponse = z
  .object({
    isSet: z.boolean(),
    /** Bản che cookie, null khi chưa dán. */
    masked: z.string().nullable(),
  })
  .meta({ id: "NotebookConnection" });

export const NotebookConnectionCheckResponse = z.object({ notebookCount: z.number().int().nonnegative() }).meta({ id: "NotebookConnectionCheck" });

export const NotebookConnectionSavedResponse = NotebookConnectionResponse.extend({ notebookCount: z.number().int().nonnegative() }).meta({
  id: "NotebookConnectionSaved",
});
