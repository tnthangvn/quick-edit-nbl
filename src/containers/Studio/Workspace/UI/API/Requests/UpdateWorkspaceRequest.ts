import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { AbsolutePath } from "../../../../Setting/Models/ConfigFields";
import { WorkspaceResponse } from "../Transformers/WorkspaceTransformer";
import { WorkspaceDescription, WorkspaceIdParams, WorkspaceName } from "./workspaceFields";

export const UpdateWorkspaceBody = z
  .object({
    name: WorkspaceName.optional(),
    description: WorkspaceDescription.optional(),
    path: AbsolutePath.optional().meta({ description: "Tìm lại thư mục đã di chuyển (phải có .spec-studio/config.json)" }),
  })
  .meta({ id: "UpdateWorkspaceInput" });

export const updateWorkspaceContract = defineContract({
  request: { params: WorkspaceIdParams, body: UpdateWorkspaceBody },
  responses: { 200: WorkspaceResponse, 404: ErrorResponse, 409: ErrorResponse },
});
