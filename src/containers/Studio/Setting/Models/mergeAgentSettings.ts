import type { AgentSettings } from "@/ship/contracts/agentSettings";
import type { AgentSettingsOverride } from "./WorkspaceConfig";
import { llmApiKeyRef } from "./defaultAgentSettings";

/**
 * Cấu hình hiệu lực = cấu hình chung + phần Workspace ghi đè. Đổi provider thì API key theo provider mới
 * (ref "llm:<provider>"); profile ghi đè không tồn tại thì giữ profile chung.
 */
export function mergeAgentSettings(base: AgentSettings, override: AgentSettingsOverride | undefined): AgentSettings {
  if (!override) return base;
  const provider = override.api?.provider ?? base.api.provider;
  const profileId = override.cli?.activeProfileId;
  return {
    activeMode: override.activeMode ?? base.activeMode,
    api: {
      ...base.api,
      provider,
      model: override.api?.model ?? base.api.model,
      temperature: override.api?.temperature ?? base.api.temperature,
      systemPrompt: override.api?.systemPrompt ?? base.api.systemPrompt,
      apiKeyRef: provider === base.api.provider ? base.api.apiKeyRef : llmApiKeyRef(provider),
    },
    cli: {
      ...base.cli,
      activeProfileId: profileId && base.cli.profiles.some((p) => p.id === profileId) ? profileId : base.cli.activeProfileId,
    },
  };
}
