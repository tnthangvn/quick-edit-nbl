import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceSecretKind } from "../../../Enums/WorkspaceSecretKind";

export const WorkspaceSecretParams = z.object({ workspaceId: z.string().min(1).max(64), kind: WorkspaceSecretKind });

export const setWorkspaceSecretContract = defineContract({
  request: {
    params: WorkspaceSecretParams,
    body: z.object({ value: z.string().trim().min(1).max(16_384) }).meta({ id: "WorkspaceSecretInput" }),
  },
  responses: { 204: null, 404: ErrorResponse },
});
