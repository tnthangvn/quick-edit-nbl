import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceIdParams } from "./workspaceFields";

export const removeWorkspaceContract = defineContract({
  request: {
    params: WorkspaceIdParams,
    query: z.object({
      /** "true" = xoá luôn thư mục làm việc trên máy (chỉ local, không đụng Git remote / Drive / NotebookLM). */
      deleteFiles: z.enum(["true", "false"]).optional(),
      /** Bắt buộc gõ "delete" khi deleteFiles=true. */
      confirm: z.string().max(20).optional(),
    }),
  },
  responses: { 204: null, 400: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
});
