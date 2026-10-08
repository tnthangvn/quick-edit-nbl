import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ListAgentSessionsController } from "../Controllers/ListAgentSessionsController";
import { listAgentSessionsContract } from "../Requests/AgentSessionRequests";

export const listAgentSessionsRoute = defineRoute({
  ...listAgentSessionsContract,
  operationId: "listAgentSessions",
  method: "get",
  path: "/api/agent/sessions",
  tags: ["AgentSession"],
  summary: "Danh sách phiên chat Agent của Workspace (History)",
  controller: ListAgentSessionsController,
});
