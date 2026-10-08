import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { BrowseDirectoryController } from "../Controllers/BrowseDirectoryController";
import { browseDirectoryContract } from "../Requests/BrowseDirectoryRequest";

export const browseDirectoryRoute = defineRoute({
  ...browseDirectoryContract,
  operationId: "browseDirectory",
  method: "get",
  path: "/api/filesystem/browse",
  tags: ["FileSystem"],
  summary: "Duyệt thư mục trên máy cho dialog chọn thư mục",
  controller: BrowseDirectoryController,
});
