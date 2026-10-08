import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceSecretParams } from "./SetWorkspaceSecretRequest";

export const deleteWorkspaceSecretContract = defineContract({
  request: { params: WorkspaceSecretParams },
  responses: { 204: null, 404: ErrorResponse },
});
