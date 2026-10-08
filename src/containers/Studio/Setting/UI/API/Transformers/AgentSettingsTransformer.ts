import "server-only";
import { z } from "zod";
import { AgentSettings } from "@/ship/contracts/agentSettings";
import { Transformer } from "@/ship/parents/Transformer";

/** Cấu hình Agent trả ra FE: không có apiKeyRef / API key, chỉ cờ hasApiKey. */
export const AgentSettingsView = z
  .object({
    activeMode: AgentSettings.shape.activeMode,
    api: AgentSettings.shape.api.omit({ apiKeyRef: true }).extend({ hasApiKey: z.boolean() }),
    cli: AgentSettings.shape.cli,
  })
  .meta({ id: "AgentSettingsView" });
export type AgentSettingsView = z.input<typeof AgentSettingsView>;

export class AgentSettingsTransformer extends Transformer<AgentSettings, AgentSettingsView> {
  transform({ activeMode, api: { apiKeyRef, ...api }, cli }: AgentSettings): AgentSettingsView {
    return { activeMode, api: { ...api, hasApiKey: apiKeyRef !== null }, cli };
  }
}
