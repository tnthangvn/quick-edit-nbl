import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ApproveSpecController } from "../Controllers/ApproveSpecController";
import { CreateSpecController } from "../Controllers/CreateSpecController";
import { DeleteSpecController } from "../Controllers/DeleteSpecController";
import { GetSpecController } from "../Controllers/GetSpecController";
import { ListSpecsController } from "../Controllers/ListSpecsController";
import { RenameSpecController } from "../Controllers/RenameSpecController";
import { StreamWorkspaceEventsController } from "../Controllers/StreamWorkspaceEventsController";
import {
  approveSpecContract,
  createSpecContract,
  deleteSpecContract,
  getSpecContract,
  listSpecsContract,
  renameSpecContract,
  streamWorkspaceEventsContract,
} from "../Requests/SpecRequests";

const SPECS = "/api/workspaces/{workspaceId}/specs" as const;
const SPEC = "/api/workspaces/{workspaceId}/specs/{file}" as const;

export const listSpecsRoute = defineRoute({
  ...listSpecsContract,
  operationId: "listSpecs",
  method: "get",
  path: SPECS,
  tags: ["Spec"],
  summary: "Danh sách file spec .md kèm trạng thái sync (Sidebar)",
  controller: ListSpecsController,
});

export const createSpecRoute = defineRoute({
  ...createSpecContract,
  operationId: "createSpec",
  method: "post",
  path: SPECS,
  tags: ["Spec"],
  summary: "Tạo file spec mới",
  controller: CreateSpecController,
});

export const getSpecRoute = defineRoute({
  ...getSpecContract,
  operationId: "getSpec",
  method: "get",
  path: SPEC,
  tags: ["Spec"],
  summary: "Đọc nội dung một file spec",
  controller: GetSpecController,
});

export const approveSpecRoute = defineRoute({
  ...approveSpecContract,
  operationId: "approveSpec",
  method: "put",
  path: SPEC,
  tags: ["Spec"],
  summary: "Approve & Save: ghi file rồi chạy pipeline publish (6.4) nền",
  description: "Ghi nguyên tử nội dung vào file (tạo mới nếu chưa có), trả runId của pipeline; tiến trình qua SSE PUBLISH_PROGRESS.",
  controller: ApproveSpecController,
});

export const renameSpecRoute = defineRoute({
  ...renameSpecContract,
  operationId: "renameSpec",
  method: "patch",
  path: SPEC,
  tags: ["Spec"],
  summary: "Đổi tên file spec",
  controller: RenameSpecController,
});

export const deleteSpecRoute = defineRoute({
  ...deleteSpecContract,
  operationId: "deleteSpec",
  method: "delete",
  path: SPEC,
  tags: ["Spec"],
  summary: "Xoá file spec local",
  controller: DeleteSpecController,
});

export const streamWorkspaceEventsRoute = defineRoute({
  ...streamWorkspaceEventsContract,
  operationId: "streamWorkspaceEvents",
  method: "get",
  path: "/api/workspaces/{workspaceId}/events",
  tags: ["Spec"],
  summary: "SSE: SPEC_CHANGED, SPEC_PROPOSED, PUBLISH_PROGRESS của Workspace",
  description:
    "Mỗi message `data:` là một WorkspaceEvent. Watcher thư mục spec bật khi có subscriber đầu tiên và đóng khi subscriber cuối ngắt. Heartbeat `: ping` mỗi 15 giây.",
  controller: StreamWorkspaceEventsController,
});
