import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { DeleteAgentSessionController } from "../Controllers/DeleteAgentSessionController";
import { deleteAgentSessionContract } from "../Requests/AgentSessionRequests";

export const deleteAgentSessionRoute = defineRoute({
  ...deleteAgentSessionContract,
  operationId: "deleteAgentSession",
  method: "delete",
  path: "/api/agent/sessions/{sessionId}",
  tags: ["AgentSession"],
  summary: "Xoá phiên chat Agent",
  controller: DeleteAgentSessionController,
});
