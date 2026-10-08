import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { ConnectorCheckResponse } from "../Transformers/ConnectorResultTransformers";
import { ConnectorIdParams } from "./connectorFields";

export const checkConnectorContract = defineContract({
  request: { params: ConnectorIdParams },
  responses: { 200: ConnectorCheckResponse, 404: ErrorResponse },
});
