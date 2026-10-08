import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { OpenWorkspaceController } from "../Controllers/OpenWorkspaceController";
import { openWorkspaceContract } from "../Requests/OpenWorkspaceRequest";

export const openWorkspaceRoute = defineRoute({
  ...openWorkspaceContract,
  operationId: "openWorkspace",
  method: "post",
  path: "/api/workspaces/{workspaceId}/open",
  tags: ["Workspace"],
  summary: "Mở Workspace: ghi thời điểm mở, trả kèm cấu hình",
  controller: OpenWorkspaceController,
});
