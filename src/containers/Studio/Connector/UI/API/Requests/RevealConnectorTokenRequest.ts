import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { ConnectorIdParams } from "./connectorFields";

export const revealConnectorTokenContract = defineContract({
  request: { params: ConnectorIdParams },
  responses: { 200: z.object({ value: z.string() }).meta({ id: "ConnectorTokenValue" }), 400: ErrorResponse, 404: ErrorResponse },
});
