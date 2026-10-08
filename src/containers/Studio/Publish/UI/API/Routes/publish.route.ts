import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ForceSyncSpecController } from "../Controllers/ForceSyncSpecController";
import { ListPublishRunsController } from "../Controllers/ListPublishRunsController";
import { forceSyncSpecContract, listPublishRunsContract } from "../Requests/PublishRequests";

export const forceSyncSpecRoute = defineRoute({
  ...forceSyncSpecContract,
  operationId: "forceSyncSpec",
  method: "post",
  path: "/api/workspaces/{workspaceId}/sync/{file}",
  tags: ["Publish"],
  summary: "Force Sync / Thử lại một đích cho file spec",
  description: "Xếp một lần chạy pipeline (sau lần đang chạy của cùng file, nếu có). Tiến trình qua SSE PUBLISH_PROGRESS.",
  controller: ForceSyncSpecController,
});

export const listPublishRunsRoute = defineRoute({
  ...listPublishRunsContract,
  operationId: "listPublishRuns",
  method: "get",
  path: "/api/workspaces/{workspaceId}/publish/runs",
  tags: ["Publish"],
  summary: "Lần chạy pipeline mới nhất của từng file (khôi phục Sync Activity sau khi kết nối lại)",
  controller: ListPublishRunsController,
});
