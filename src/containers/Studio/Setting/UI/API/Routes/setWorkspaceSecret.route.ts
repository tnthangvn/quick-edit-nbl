import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { SetWorkspaceSecretController } from "../Controllers/SetWorkspaceSecretController";
import { setWorkspaceSecretContract } from "../Requests/SetWorkspaceSecretRequest";

export const setWorkspaceSecretRoute = defineRoute({
  ...setWorkspaceSecretContract,
  operationId: "setWorkspaceSecret",
  method: "put",
  path: "/api/workspaces/{workspaceId}/secrets/{kind}",
  tags: ["Setting"],
  summary: "Ghi secret của Workspace (chỉ ghi)",
  controller: SetWorkspaceSecretController,
});
