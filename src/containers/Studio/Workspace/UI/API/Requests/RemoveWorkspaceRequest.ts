import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceIdParams } from "./workspaceFields";

export const removeWorkspaceContract = defineContract({
  request: { params: WorkspaceIdParams },
  responses: { 204: null, 404: ErrorResponse },
});
