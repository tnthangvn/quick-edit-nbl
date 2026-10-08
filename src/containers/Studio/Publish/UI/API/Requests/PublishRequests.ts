import { z } from "zod";
import { PublishTarget } from "@/ship/contracts/enums/sync";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { PublishRunListResponse, PublishRunResponse } from "../Transformers/PublishRunTransformer";

export const forceSyncSpecContract = defineContract({
  request: {
    params: z.object({ workspaceId: z.string().min(1), file: z.string().trim().min(1).max(1024) }),
    body: z
      .object({ target: PublishTarget.optional().meta({ description: "Chỉ chạy lại đích này (nút Thử lại); bỏ trống = mọi đích đã cấu hình" }) })
      .default({})
      .meta({ id: "ForceSyncBody" }),
  },
  responses: { 202: PublishRunResponse, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
});

export const listPublishRunsContract = defineContract({
  request: { params: z.object({ workspaceId: z.string().min(1) }) },
  responses: { 200: PublishRunListResponse, 404: ErrorResponse },
});
