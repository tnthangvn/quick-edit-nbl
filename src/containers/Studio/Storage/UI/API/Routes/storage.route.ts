import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CompleteGoogleOAuthController } from "../Controllers/CompleteGoogleOAuthController";
import { DisconnectGoogleOAuthController } from "../Controllers/DisconnectGoogleOAuthController";
import { GetGoogleOAuthStatusController } from "../Controllers/GetGoogleOAuthStatusController";
import { GetStorageStatusController } from "../Controllers/GetStorageStatusController";
import { PullWorkspaceController } from "../Controllers/PullWorkspaceController";
import { PushWorkspaceController } from "../Controllers/PushWorkspaceController";
import { StartGoogleOAuthController } from "../Controllers/StartGoogleOAuthController";
import {
  completeGoogleOAuthContract,
  disconnectGoogleOAuthContract,
  getGoogleOAuthStatusContract,
  getStorageStatusContract,
  pullWorkspaceContract,
  pushWorkspaceContract,
  startGoogleOAuthContract,
} from "../Requests/StorageRequests";

export const pullWorkspaceRoute = defineRoute({
  ...pullWorkspaceContract,
  operationId: "pullWorkspace",
  method: "post",
  path: "/api/workspaces/{workspaceId}/pull",
  tags: ["Storage"],
  summary: "Pull từ nơi lưu trữ (Git: pull --ff-only, Drive: tải file .md về)",
  controller: PullWorkspaceController,
});

export const pushWorkspaceRoute = defineRoute({
  ...pushWorkspaceContract,
  operationId: "pushWorkspace",
  method: "post",
  path: "/api/workspaces/{workspaceId}/push",
  tags: ["Storage"],
  summary: "Đẩy thay đổi spec lên nơi lưu trữ (Git: commit + push hoặc branch + PR theo publishMode, Drive: tải lên)",
  controller: PushWorkspaceController,
});

export const getStorageStatusRoute = defineRoute({
  ...getStorageStatusContract,
  operationId: "getStorageStatus",
  method: "get",
  path: "/api/workspaces/{workspaceId}/storage/status",
  tags: ["Storage"],
  summary: "Storage Status trên Header: thay đổi chưa commit / push (không gọi mạng)",
  controller: GetStorageStatusController,
});

export const startGoogleOAuthRoute = defineRoute({
  ...startGoogleOAuthContract,
  operationId: "startGoogleOAuth",
  method: "get",
  path: "/api/google/oauth/start",
  tags: ["Storage"],
  summary: "URL đăng nhập Google (Drive) để FE mở",
  controller: StartGoogleOAuthController,
});

export const completeGoogleOAuthRoute = defineRoute({
  ...completeGoogleOAuthContract,
  operationId: "completeGoogleOAuth",
  method: "get",
  path: "/api/google/oauth/callback",
  tags: ["Storage"],
  summary: "Callback OAuth của Google: lưu refresh token vào secret store",
  controller: CompleteGoogleOAuthController,
});

export const getGoogleOAuthStatusRoute = defineRoute({
  ...getGoogleOAuthStatusContract,
  operationId: "getGoogleOAuthStatus",
  method: "get",
  path: "/api/google/oauth/status",
  tags: ["Storage"],
  summary: "Đã cấu hình / đã đăng nhập Google chưa",
  controller: GetGoogleOAuthStatusController,
});

export const disconnectGoogleOAuthRoute = defineRoute({
  ...disconnectGoogleOAuthContract,
  operationId: "disconnectGoogleOAuth",
  method: "delete",
  path: "/api/google/oauth",
  tags: ["Storage"],
  summary: "Đăng xuất Google: xoá refresh token (của Workspace hoặc dùng chung)",
  controller: DisconnectGoogleOAuthController,
});
