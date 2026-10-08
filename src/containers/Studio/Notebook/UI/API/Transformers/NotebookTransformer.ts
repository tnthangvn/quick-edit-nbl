import "server-only";
import { z } from "zod";

export const NotebookCheckResponse = z
  .object({
    notebookId: z.string(),
    /** false: notebook không tồn tại hoặc tài khoản nlm không có quyền. */
    ok: z.boolean(),
    sourceCount: z.number().int().nonnegative().nullable(),
    title: z.string().nullable(),
  })
  .meta({ id: "NotebookCheckResult" });
