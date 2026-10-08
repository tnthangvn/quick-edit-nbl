import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { ConnectorToolListResponse } from "../Transformers/ConnectorResultTransformers";
import { ConnectorIdParams } from "./connectorFields";

export const listConnectorToolsContract = defineContract({
  request: { params: ConnectorIdParams },
  responses: { 200: ConnectorToolListResponse, 400: ErrorResponse, 404: ErrorResponse, 502: ErrorResponse },
});
