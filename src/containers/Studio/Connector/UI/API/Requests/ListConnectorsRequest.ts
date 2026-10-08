import { defineContract } from "@/ship/engine/defineRoute";
import { ConnectorListResponse } from "../Transformers/ConnectorTransformer";

export const listConnectorsContract = defineContract({
  responses: { 200: ConnectorListResponse },
});
