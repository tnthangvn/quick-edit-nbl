import { defineContract } from "@/ship/engine/defineRoute";
import { AgentSettingsView } from "../Transformers/AgentSettingsTransformer";

export const getSettingsContract = defineContract({
  responses: { 200: AgentSettingsView },
});
