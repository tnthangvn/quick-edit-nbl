import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { SecretValueResponse } from "../Transformers/WorkspaceSecretsTransformer";

export const revealApiKeyContract = defineContract({
  responses: { 200: SecretValueResponse, 400: ErrorResponse },
});
