import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { GetWorkspaceController } from "../Controllers/GetWorkspaceController";
import { getWorkspaceContract } from "../Requests/GetWorkspaceRequest";

export const getWorkspaceRoute = defineRoute({
  ...getWorkspaceContract,
  operationId: "getWorkspace",
  method: "get",
  path: "/api/workspaces/{workspaceId}",
  tags: ["Workspace"],
  summary: "Chi tiết một Workspace",
  controller: GetWorkspaceController,
});
