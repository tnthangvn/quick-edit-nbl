import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { checkWorkspaceRoute } from "./checkWorkspace.route";
import { createWorkspaceRoute } from "./createWorkspace.route";
import { getWorkspaceRoute } from "./getWorkspace.route";
import { importWorkspaceRoute } from "./importWorkspace.route";
import { listWorkspacesRoute } from "./listWorkspaces.route";
import { openWorkspaceRoute } from "./openWorkspace.route";
import { removeWorkspaceRoute } from "./removeWorkspace.route";
import { updateWorkspaceRoute } from "./updateWorkspace.route";

/** Mọi route của container Workspace. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [
  listWorkspacesRoute,
  createWorkspaceRoute,
  getWorkspaceRoute,
  updateWorkspaceRoute,
  removeWorkspaceRoute,
  importWorkspaceRoute,
  openWorkspaceRoute,
  checkWorkspaceRoute,
];
