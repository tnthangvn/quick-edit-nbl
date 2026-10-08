import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { UpdateWorkspaceConfigController } from "../Controllers/UpdateWorkspaceConfigController";
import { updateWorkspaceConfigContract } from "../Requests/UpdateWorkspaceConfigRequest";

export const updateWorkspaceConfigRoute = defineRoute({
  ...updateWorkspaceConfigContract,
  operationId: "updateWorkspaceConfig",
  method: "put",
  path: "/api/workspaces/{workspaceId}/config",
  tags: ["Setting"],
  summary: "Lưu cấu hình Workspace (Tab 3, 4)",
  controller: UpdateWorkspaceConfigController,
});
