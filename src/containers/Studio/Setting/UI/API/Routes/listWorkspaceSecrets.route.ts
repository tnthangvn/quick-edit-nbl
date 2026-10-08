import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ListWorkspaceSecretsController } from "../Controllers/ListWorkspaceSecretsController";
import { listWorkspaceSecretsContract } from "../Requests/ListWorkspaceSecretsRequest";

export const listWorkspaceSecretsRoute = defineRoute({
  ...listWorkspaceSecretsContract,
  operationId: "listWorkspaceSecrets",
  method: "get",
  path: "/api/workspaces/{workspaceId}/secrets",
  tags: ["Setting"],
  summary: "Loại secret nào của Workspace đã nhập (chỉ boolean)",
  controller: ListWorkspaceSecretsController,
});
