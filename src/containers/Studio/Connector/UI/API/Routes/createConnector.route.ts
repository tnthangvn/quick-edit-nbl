import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CreateConnectorController } from "../Controllers/CreateConnectorController";
import { createConnectorContract } from "../Requests/CreateConnectorRequest";

export const createConnectorRoute = defineRoute({
  ...createConnectorContract,
  operationId: "createConnector",
  method: "post",
  path: "/api/connectors",
  tags: ["Connector"],
  summary: "Thêm connector Git provider",
  controller: CreateConnectorController,
});
