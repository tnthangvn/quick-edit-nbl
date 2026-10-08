import { defineContract } from "@/ship/engine/defineRoute";
import { CliAgentDetectionList } from "../Transformers/CliAgentDetectionTransformer";

export const detectCliAgentsContract = defineContract({
  responses: { 200: CliAgentDetectionList },
});
