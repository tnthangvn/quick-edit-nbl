import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { GetAgentSessionController } from "../Controllers/GetAgentSessionController";
import { getAgentSessionContract } from "../Requests/AgentSessionRequests";

export const getAgentSessionRoute = defineRoute({
  ...getAgentSessionContract,
  operationId: "getAgentSession",
  method: "get",
  path: "/api/agent/sessions/{sessionId}",
  tags: ["AgentSession"],
  summary: "Một phiên chat Agent: tin nhắn API + các lượt CLI",
  controller: GetAgentSessionController,
});
