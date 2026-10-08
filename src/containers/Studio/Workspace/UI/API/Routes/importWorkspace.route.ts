import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ImportWorkspaceController } from "../Controllers/ImportWorkspaceController";
import { importWorkspaceContract } from "../Requests/ImportWorkspaceRequest";

export const importWorkspaceRoute = defineRoute({
  ...importWorkspaceContract,
  operationId: "importWorkspace",
  method: "post",
  path: "/api/workspaces/import",
  tags: ["Workspace"],
  summary: "Mở thư mục có sẵn .spec-studio/config.json",
  controller: ImportWorkspaceController,
});
