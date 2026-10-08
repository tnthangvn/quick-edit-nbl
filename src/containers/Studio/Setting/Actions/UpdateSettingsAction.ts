import "server-only";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import { Action } from "@/ship/parents/Action";
import { llmApiKeyRef } from "../Models/defaultAgentSettings";
import { CheckSecretsPresenceTask } from "../Tasks/CheckSecretsPresenceTask";
import { SaveAgentSettingsTask } from "../Tasks/SaveAgentSettingsTask";
import { WriteSecretTask } from "../Tasks/WriteSecretTask";

export type UpdateSettingsInput = {
  activeMode: AgentSettings["activeMode"];
  api: Omit<AgentSettings["api"], "apiKeyRef"> & {
    /** Chỉ ghi. Chuỗi = lưu key cho provider đang chọn, null = xoá, bỏ trống = giữ nguyên. */
    apiKey?: string | null;
  };
  cli: AgentSettings["cli"];
};

/**
 * Lưu cấu hình chung. API key nằm trong secret store theo provider ("llm:<provider>"), cấu hình chỉ giữ ref;
 * đổi provider thì tự trỏ tới key đã lưu của provider đó (nếu có).
 */
export class UpdateSettingsAction extends Action<UpdateSettingsInput, AgentSettings> {
  constructor(
    private readonly writeSecret = new WriteSecretTask(),
    private readonly checkSecrets = new CheckSecretsPresenceTask(),
    private readonly saveAgentSettings = new SaveAgentSettingsTask(),
  ) {
    super();
  }

  async run({ activeMode, api: { apiKey, ...api }, cli }: UpdateSettingsInput): Promise<AgentSettings> {
    const ref = llmApiKeyRef(api.provider);
    if (apiKey !== undefined) await this.writeSecret.run({ ref, value: apiKey });
    const hasKey = apiKey !== undefined ? apiKey !== null : (await this.checkSecrets.run({ refs: [ref] }))[ref];
    return this.saveAgentSettings.run({ activeMode, api: { ...api, apiKeyRef: hasKey ? ref : null }, cli });
  }
}
