import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { DetectCliAgentsController } from "../Controllers/DetectCliAgentsController";
import { detectCliAgentsContract } from "../Requests/DetectCliAgentsRequest";

export const detectCliAgentsRoute = defineRoute({
  ...detectCliAgentsContract,
  operationId: "detectCliAgents",
  method: "get",
  path: "/api/agent/detect",
  tags: ["CliRunner"],
  summary: "Dò CLI agent đã cài (which, version, đăng nhập) cho Settings Tab 2",
  controller: DetectCliAgentsController,
});
