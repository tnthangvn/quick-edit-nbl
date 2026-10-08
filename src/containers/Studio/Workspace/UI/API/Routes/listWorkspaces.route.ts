import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ListWorkspacesController } from "../Controllers/ListWorkspacesController";
import { listWorkspacesContract } from "../Requests/ListWorkspacesRequest";

export const listWorkspacesRoute = defineRoute({
  ...listWorkspacesContract,
  operationId: "listWorkspaces",
  method: "get",
  path: "/api/workspaces",
  tags: ["Workspace"],
  summary: "Danh sách Workspace (màn hình Projects)",
  controller: ListWorkspacesController,
});
