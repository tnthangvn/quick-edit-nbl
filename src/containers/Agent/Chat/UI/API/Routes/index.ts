import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { streamChatRoute } from "./streamChat.route";
import { testLlmConnectionRoute } from "./testLlmConnection.route";

/** Mọi route của container Chat. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [streamChatRoute, testLlmConnectionRoute];
