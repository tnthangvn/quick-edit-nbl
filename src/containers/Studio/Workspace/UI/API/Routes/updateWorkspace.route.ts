import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { UpdateWorkspaceController } from "../Controllers/UpdateWorkspaceController";
import { updateWorkspaceContract } from "../Requests/UpdateWorkspaceRequest";

export const updateWorkspaceRoute = defineRoute({
  ...updateWorkspaceContract,
  operationId: "updateWorkspace",
  method: "patch",
  path: "/api/workspaces/{workspaceId}",
  tags: ["Workspace"],
  summary: "Đổi tên / mô tả / tìm lại thư mục Workspace",
  controller: UpdateWorkspaceController,
});
