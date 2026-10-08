import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ListConnectorsController } from "../Controllers/ListConnectorsController";
import { listConnectorsContract } from "../Requests/ListConnectorsRequest";

export const listConnectorsRoute = defineRoute({
  ...listConnectorsContract,
  operationId: "listConnectors",
  method: "get",
  path: "/api/connectors",
  tags: ["Connector"],
  summary: "Danh sách connector (Tab 5)",
  controller: ListConnectorsController,
});
