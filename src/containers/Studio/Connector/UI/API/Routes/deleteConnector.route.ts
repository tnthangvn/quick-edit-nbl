import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { DeleteConnectorController } from "../Controllers/DeleteConnectorController";
import { deleteConnectorContract } from "../Requests/DeleteConnectorRequest";

export const deleteConnectorRoute = defineRoute({
  ...deleteConnectorContract,
  operationId: "deleteConnector",
  method: "delete",
  path: "/api/connectors/{connectorId}",
  tags: ["Connector"],
  summary: "Xoá connector và secret của nó",
  controller: DeleteConnectorController,
});
