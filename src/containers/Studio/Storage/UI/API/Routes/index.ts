import type { RouteDefinition } from "@/ship/engine/defineRoute";
import {
  completeGoogleOAuthRoute,
  disconnectGoogleOAuthRoute,
  getGoogleOAuthStatusRoute,
  getStorageStatusRoute,
  pullWorkspaceRoute,
  pushWorkspaceRoute,
  startGoogleOAuthRoute,
} from "./storage.route";

/** Mọi route của container Storage. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [
  pullWorkspaceRoute,
  pushWorkspaceRoute,
  getStorageStatusRoute,
  startGoogleOAuthRoute,
  completeGoogleOAuthRoute,
  getGoogleOAuthStatusRoute,
  disconnectGoogleOAuthRoute,
];
