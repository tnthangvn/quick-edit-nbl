import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceResponse } from "../Transformers/WorkspaceTransformer";
import { WorkspaceIdParams } from "./workspaceFields";

export const getWorkspaceContract = defineContract({
  request: { params: WorkspaceIdParams },
  responses: { 200: WorkspaceResponse, 404: ErrorResponse },
});
