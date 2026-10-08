import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { CheckConnectorController } from "../Controllers/CheckConnectorController";
import { checkConnectorContract } from "../Requests/CheckConnectorRequest";

export const checkConnectorRoute = defineRoute({
  ...checkConnectorContract,
  operationId: "checkConnector",
  method: "post",
  path: "/api/connectors/{connectorId}/check",
  tags: ["Connector"],
  summary: "Kiểm tra connector: tài khoản, host, phạm vi, trạng thái",
  controller: CheckConnectorController,
});
