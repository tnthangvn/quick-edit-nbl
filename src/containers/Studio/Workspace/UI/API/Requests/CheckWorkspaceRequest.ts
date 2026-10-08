import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceCheckResponse } from "../Transformers/WorkspaceResultTransformers";
import { WorkspaceIdParams } from "./workspaceFields";

export const checkWorkspaceContract = defineContract({
  request: { params: WorkspaceIdParams },
  responses: { 200: WorkspaceCheckResponse, 404: ErrorResponse },
});
