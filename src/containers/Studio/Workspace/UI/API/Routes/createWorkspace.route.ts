import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CreateWorkspaceController } from "../Controllers/CreateWorkspaceController";
import { createWorkspaceContract } from "../Requests/CreateWorkspaceRequest";

export const createWorkspaceRoute = defineRoute({
  ...createWorkspaceContract,
  operationId: "createWorkspace",
  method: "post",
  path: "/api/workspaces",
  tags: ["Workspace"],
  summary: "Tạo Workspace theo Wizard + New Project (spec 3.0.1, 6.3)",
  controller: CreateWorkspaceController,
});
