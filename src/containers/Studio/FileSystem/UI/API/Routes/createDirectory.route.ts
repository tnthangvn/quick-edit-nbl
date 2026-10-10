import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CreateDirectoryController } from "../Controllers/CreateDirectoryController";
import { createDirectoryContract } from "../Requests/CreateDirectoryRequest";

export const createDirectoryRoute = defineRoute({
  ...createDirectoryContract,
  operationId: "createDirectory",
  method: "post",
  path: "/api/filesystem/directories",
  tags: ["FileSystem"],
  summary: "Tạo thư mục con (nút Thư mục mới trong dialog chọn thư mục)",
  controller: CreateDirectoryController,
});
