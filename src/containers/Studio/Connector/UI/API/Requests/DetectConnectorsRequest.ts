import { defineContract } from "@/ship/engine/defineRoute";
import { DetectedCliListResponse } from "../Transformers/ConnectorResultTransformers";

export const detectConnectorsContract = defineContract({
  responses: { 200: DetectedCliListResponse },
});
