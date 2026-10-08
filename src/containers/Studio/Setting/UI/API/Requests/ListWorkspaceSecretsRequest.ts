import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceSecretListResponse } from "../Transformers/WorkspaceSecretsTransformer";
import { WorkspaceIdParams } from "./GetWorkspaceConfigRequest";

export const listWorkspaceSecretsContract = defineContract({
  request: { params: WorkspaceIdParams },
  responses: { 200: WorkspaceSecretListResponse, 404: ErrorResponse },
});
