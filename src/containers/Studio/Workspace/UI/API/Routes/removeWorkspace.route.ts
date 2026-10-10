import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { RemoveWorkspaceController } from "../Controllers/RemoveWorkspaceController";
import { removeWorkspaceContract } from "../Requests/RemoveWorkspaceRequest";

export const removeWorkspaceRoute = defineRoute({
  ...removeWorkspaceContract,
  operationId: "removeWorkspace",
  method: "delete",
  path: "/api/workspaces/{workspaceId}",
  tags: ["Workspace"],
  summary: "Gỡ Workspace khỏi danh sách; deleteFiles=true + confirm=delete thì xoá luôn thư mục trên máy (chỉ local)",
  controller: RemoveWorkspaceController,
});
