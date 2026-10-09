import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { SecretValueResponse } from "../Transformers/WorkspaceSecretsTransformer";
import { WorkspaceSecretParams } from "./SetWorkspaceSecretRequest";

export const revealWorkspaceSecretContract = defineContract({
  request: { params: WorkspaceSecretParams },
  responses: { 200: SecretValueResponse, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse },
});
