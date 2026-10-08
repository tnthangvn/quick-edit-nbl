import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { forceSyncSpecRoute, listPublishRunsRoute } from "./publish.route";

/** Mọi route của container Publish. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [forceSyncSpecRoute, listPublishRunsRoute];
