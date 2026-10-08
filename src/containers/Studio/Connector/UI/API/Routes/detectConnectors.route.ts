import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { DetectConnectorsController } from "../Controllers/DetectConnectorsController";
import { detectConnectorsContract } from "../Requests/DetectConnectorsRequest";

export const detectConnectorsRoute = defineRoute({
  ...detectConnectorsContract,
  operationId: "detectConnectors",
  method: "get",
  path: "/api/connectors/detect",
  tags: ["Connector"],
  summary: "Tự dò CLI Git provider trên máy (gh, glab, tea)",
  controller: DetectConnectorsController,
});
