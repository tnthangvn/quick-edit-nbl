import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { ConnectorIdParams } from "./connectorFields";

export const deleteConnectorContract = defineContract({
  request: { params: ConnectorIdParams },
  responses: { 204: null, 404: ErrorResponse },
});
