import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { createAgentSessionRoute } from "./createAgentSession.route";
import { deleteAgentSessionRoute } from "./deleteAgentSession.route";
import { getAgentSessionRoute } from "./getAgentSession.route";
import { listAgentSessionsRoute } from "./listAgentSessions.route";

/** Mọi route của container Session. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [listAgentSessionsRoute, createAgentSessionRoute, getAgentSessionRoute, deleteAgentSessionRoute];
