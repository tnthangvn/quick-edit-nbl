import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { detectCliAgentsRoute } from "./detectCliAgents.route";
import { startCliRunRoute } from "./startCliRun.route";
import { stopCliRunRoute } from "./stopCliRun.route";
import { streamCliRunEventsRoute } from "./streamCliRunEvents.route";

/** Mọi route của container CliRunner. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [detectCliAgentsRoute, startCliRunRoute, streamCliRunEventsRoute, stopCliRunRoute];
