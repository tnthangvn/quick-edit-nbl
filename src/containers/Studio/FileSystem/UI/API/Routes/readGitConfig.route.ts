import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ReadGitConfigController } from "../Controllers/ReadGitConfigController";
import { readGitConfigContract } from "../Requests/ReadGitConfigRequest";

export const readGitConfigRoute = defineRoute({
  ...readGitConfigContract,
  operationId: "readGitConfig",
  method: "get",
  path: "/api/filesystem/git-config",
  tags: ["FileSystem"],
  summary: "Đọc remote URL trong .git/config của thư mục để Wizard điền nhanh",
  controller: ReadGitConfigController,
});
