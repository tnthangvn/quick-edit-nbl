import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ListConnectorBranchesController } from "../Controllers/ListConnectorBranchesController";
import { listConnectorBranchesContract } from "../Requests/ListConnectorBranchesRequest";

export const listConnectorBranchesRoute = defineRoute({
  ...listConnectorBranchesContract,
  operationId: "listConnectorBranches",
  method: "get",
  path: "/api/connectors/{connectorId}/branches",
  tags: ["Connector"],
  summary: "Liệt kê branch của repo qua connector",
  controller: ListConnectorBranchesController,
});
