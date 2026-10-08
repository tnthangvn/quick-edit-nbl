import type { RouteDefinition } from "@/ship/engine/defineRoute";
import {
  approveSpecRoute,
  createSpecRoute,
  deleteSpecRoute,
  getSpecRoute,
  listSpecsRoute,
  renameSpecRoute,
  streamWorkspaceEventsRoute,
} from "./specs.route";

/** Mọi route của container Spec. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [
  listSpecsRoute,
  createSpecRoute,
  getSpecRoute,
  approveSpecRoute,
  renameSpecRoute,
  deleteSpecRoute,
  streamWorkspaceEventsRoute,
];
