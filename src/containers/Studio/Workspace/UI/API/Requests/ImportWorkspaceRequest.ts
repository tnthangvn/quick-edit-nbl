import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { AbsolutePath } from "../../../../Setting/Models/ConfigFields";
import { WorkspaceResponse } from "../Transformers/WorkspaceTransformer";
import { WorkspaceName } from "./workspaceFields";

export const ImportWorkspaceBody = z
  .object({
    path: AbsolutePath,
    name: WorkspaceName.optional().meta({ description: "Đặt tên khác khi tên trong config.json đã trùng" }),
  })
  .meta({ id: "ImportWorkspaceInput" });

export const importWorkspaceContract = defineContract({
  request: { body: ImportWorkspaceBody },
  responses: { 201: WorkspaceResponse, 404: ErrorResponse, 409: ErrorResponse },
});
