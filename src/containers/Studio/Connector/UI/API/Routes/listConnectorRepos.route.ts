import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ListConnectorReposController } from "../Controllers/ListConnectorReposController";
import { listConnectorReposContract } from "../Requests/ListConnectorReposRequest";

export const listConnectorReposRoute = defineRoute({
  ...listConnectorReposContract,
  operationId: "listConnectorRepos",
  method: "get",
  path: "/api/connectors/{connectorId}/repos",
  tags: ["Connector"],
  summary: "Liệt kê repo qua connector",
  controller: ListConnectorReposController,
});
