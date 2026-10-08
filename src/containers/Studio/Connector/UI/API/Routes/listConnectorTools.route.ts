import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ListConnectorToolsController } from "../Controllers/ListConnectorToolsController";
import { listConnectorToolsContract } from "../Requests/ListConnectorToolsRequest";

export const listConnectorToolsRoute = defineRoute({
  ...listConnectorToolsContract,
  operationId: "listConnectorTools",
  method: "get",
  path: "/api/connectors/{connectorId}/tools",
  tags: ["Connector"],
  summary: "Danh sách tool của MCP server",
  controller: ListConnectorToolsController,
});
