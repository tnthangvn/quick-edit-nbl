import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import {
  CheckNotebookConnectionController,
  DeleteNotebookConnectionController,
  GetNotebookConnectionController,
  SaveNotebookConnectionController,
} from "../Controllers/NotebookConnectionControllers";
import {
  checkNotebookConnectionContract,
  deleteNotebookConnectionContract,
  getNotebookConnectionContract,
  saveNotebookConnectionContract,
} from "../Requests/NotebookConnectionRequests";

export const getNotebookConnectionRoute = defineRoute({
  ...getNotebookConnectionContract,
  operationId: "getNotebookConnection",
  method: "get",
  path: "/api/notebooklm/connection",
  tags: ["Notebook"],
  summary: "Đã dán cookie NotebookLM dùng chung chưa (bản che)",
  controller: GetNotebookConnectionController,
});

export const saveNotebookConnectionRoute = defineRoute({
  ...saveNotebookConnectionContract,
  operationId: "saveNotebookConnection",
  method: "put",
  path: "/api/notebooklm/connection",
  tags: ["Notebook"],
  summary: "Dán cookie NotebookLM: thử kết nối rồi lưu (mã hoá)",
  controller: SaveNotebookConnectionController,
});

export const deleteNotebookConnectionRoute = defineRoute({
  ...deleteNotebookConnectionContract,
  operationId: "deleteNotebookConnection",
  method: "delete",
  path: "/api/notebooklm/connection",
  tags: ["Notebook"],
  summary: "Xoá cookie NotebookLM dùng chung",
  controller: DeleteNotebookConnectionController,
});

export const checkNotebookConnectionRoute = defineRoute({
  ...checkNotebookConnectionContract,
  operationId: "checkNotebookConnection",
  method: "post",
  path: "/api/notebooklm/connection/check",
  tags: ["Notebook"],
  summary: "Kiểm tra cookie NotebookLM dùng chung (đếm notebook)",
  controller: CheckNotebookConnectionController,
});
