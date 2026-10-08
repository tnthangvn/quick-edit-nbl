import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CheckNotebookController } from "../Controllers/CheckNotebookController";
import { checkNotebookContract } from "../Requests/CheckNotebookRequest";

export const checkNotebookRoute = defineRoute({
  ...checkNotebookContract,
  operationId: "checkNotebook",
  method: "post",
  path: "/api/workspaces/{workspaceId}/notebook/check",
  tags: ["Notebook"],
  summary: "Kiểm tra truy cập notebook NotebookLM (qua CLI nlm) và đếm source",
  controller: CheckNotebookController,
});
