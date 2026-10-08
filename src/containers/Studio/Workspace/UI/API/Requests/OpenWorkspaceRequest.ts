import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { OpenedWorkspaceResponse } from "../Transformers/WorkspaceResultTransformers";
import { WorkspaceIdParams } from "./workspaceFields";

export const openWorkspaceContract = defineContract({
  request: { params: WorkspaceIdParams },
  responses: { 200: OpenedWorkspaceResponse, 404: ErrorResponse, 409: ErrorResponse },
});
