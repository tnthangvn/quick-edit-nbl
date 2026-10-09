import "server-only";
import { z } from "zod";
import { AgentSettings } from "@/ship/contracts/agentSettings";
import { Transformer } from "@/ship/parents/Transformer";

/** Cấu hình Agent trả ra FE: không có apiKeyRef / API key, chỉ cờ hasApiKey và bản che apiKeyMasked. */
export const AgentSettingsView = z
  .object({
    activeMode: AgentSettings.shape.activeMode,
    api: AgentSettings.shape.api.omit({ apiKeyRef: true }).extend({ hasApiKey: z.boolean(), apiKeyMasked: z.string().nullable() }),
    cli: AgentSettings.shape.cli,
  })
  .meta({ id: "AgentSettingsView" });
export type AgentSettingsView = z.input<typeof AgentSettingsView>;

/** Cấu hình kèm bản che API key (Action tính, Transformer không đọc secret store). */
export type AgentSettingsWithMask = { settings: AgentSettings; apiKeyMasked: string | null };

export class AgentSettingsTransformer extends Transformer<AgentSettingsWithMask, AgentSettingsView> {
  transform({ settings: { activeMode, api: { apiKeyRef, ...api }, cli }, apiKeyMasked }: AgentSettingsWithMask): AgentSettingsView {
    return { activeMode, api: { ...api, hasApiKey: apiKeyRef !== null, apiKeyMasked: apiKeyRef !== null ? apiKeyMasked : null }, cli };
  }
}
