import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CreateAgentSessionController } from "../Controllers/CreateAgentSessionController";
import { createAgentSessionContract } from "../Requests/AgentSessionRequests";

export const createAgentSessionRoute = defineRoute({
  ...createAgentSessionContract,
  operationId: "createAgentSession",
  method: "post",
  path: "/api/agent/sessions",
  tags: ["AgentSession"],
  summary: "Mở phiên chat Agent mới",
  controller: CreateAgentSessionController,
});
