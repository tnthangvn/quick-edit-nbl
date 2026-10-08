import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { GetWorkspaceConfigController } from "../Controllers/GetWorkspaceConfigController";
import { getWorkspaceConfigContract } from "../Requests/GetWorkspaceConfigRequest";

export const getWorkspaceConfigRoute = defineRoute({
  ...getWorkspaceConfigContract,
  operationId: "getWorkspaceConfig",
  method: "get",
  path: "/api/workspaces/{workspaceId}/config",
  tags: ["Setting"],
  summary: "Cấu hình Workspace (.spec-studio/config.json, Tab 3, 4)",
  controller: GetWorkspaceConfigController,
});
