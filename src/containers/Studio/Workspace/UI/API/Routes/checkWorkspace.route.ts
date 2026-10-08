import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CheckWorkspaceController } from "../Controllers/CheckWorkspaceController";
import { checkWorkspaceContract } from "../Requests/CheckWorkspaceRequest";

export const checkWorkspaceRoute = defineRoute({
  ...checkWorkspaceContract,
  operationId: "checkWorkspace",
  method: "post",
  path: "/api/workspaces/{workspaceId}/check",
  tags: ["Workspace"],
  summary: "Kiểm tra thư mục, Git remote, quyền Drive, Notebook",
  controller: CheckWorkspaceController,
});
