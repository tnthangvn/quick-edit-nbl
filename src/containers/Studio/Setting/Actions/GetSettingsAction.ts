import "server-only";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import { Action } from "@/ship/parents/Action";
import { GetAgentSettingsTask } from "../Tasks/GetAgentSettingsTask";
import { MaskSecretsTask } from "../Tasks/MaskSecretsTask";

/** Cấu hình chung của app (Tab 1, 2), kèm bản che API key. */
export class GetSettingsAction extends Action<void, { settings: AgentSettings; apiKeyMasked: string | null }> {
  constructor(
    private readonly getAgentSettings = new GetAgentSettingsTask(),
    private readonly maskSecrets = new MaskSecretsTask(),
  ) {
    super();
  }

  async run(): Promise<{ settings: AgentSettings; apiKeyMasked: string | null }> {
    const settings = await this.getAgentSettings.run();
    const ref = settings.api.apiKeyRef;
    return { settings, apiKeyMasked: ref ? (await this.maskSecrets.run({ refs: [ref] }))[ref] : null };
  }
}
