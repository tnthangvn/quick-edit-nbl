import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { DeleteWorkspaceSecretController } from "../Controllers/DeleteWorkspaceSecretController";
import { deleteWorkspaceSecretContract } from "../Requests/DeleteWorkspaceSecretRequest";

export const deleteWorkspaceSecretRoute = defineRoute({
  ...deleteWorkspaceSecretContract,
  operationId: "deleteWorkspaceSecret",
  method: "delete",
  path: "/api/workspaces/{workspaceId}/secrets/{kind}",
  tags: ["Setting"],
  summary: "Xoá secret của Workspace",
  controller: DeleteWorkspaceSecretController,
});
