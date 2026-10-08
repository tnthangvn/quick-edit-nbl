import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { UpdateConnectorController } from "../Controllers/UpdateConnectorController";
import { updateConnectorContract } from "../Requests/UpdateConnectorRequest";

export const updateConnectorRoute = defineRoute({
  ...updateConnectorContract,
  operationId: "updateConnector",
  method: "patch",
  path: "/api/connectors/{connectorId}",
  tags: ["Connector"],
  summary: "Sửa connector, bật/tắt tool MCP cho Agent",
  controller: UpdateConnectorController,
});
