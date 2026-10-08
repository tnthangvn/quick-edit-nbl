import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { browseDirectoryRoute } from "./browseDirectory.route";

/** Mọi route của container FileSystem. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [browseDirectoryRoute];
