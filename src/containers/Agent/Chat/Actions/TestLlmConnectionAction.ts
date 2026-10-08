import "server-only";
import { studio } from "@/containers/providers";
import type { LlmProvider } from "@/ship/contracts/enums/agent";
import type { AgentSettingsAccess } from "@/ship/contracts/studioAccess";
import { Action } from "@/ship/parents/Action";
import { CreateLanguageModelTask } from "../Tasks/CreateLanguageModelTask";
import { PingLanguageModelTask } from "../Tasks/PingLanguageModelTask";
import { ResolveApiKeyTask } from "../Tasks/ResolveApiKeyTask";

export type TestLlmConnectionInput = {
  provider: LlmProvider;
  model: string;
  baseUrl?: string;
  /** Key đang nhập trên form; bỏ trống thì dùng key đã lưu (chỉ khi cùng provider với cấu hình đã lưu). */
  apiKey?: string;
  workspaceId?: string;
};

/** Nút Test Connection ở Settings Tab 1. Lỗi → AGENT.LLM_AUTH_FAILED / MODEL_NOT_FOUND / LLM_UNREACHABLE... */
export class TestLlmConnectionAction extends Action<TestLlmConnectionInput, { latencyMs: number }> {
  constructor(
    private readonly settings: AgentSettingsAccess = studio.agentSettings(),
    private readonly resolveApiKey = new ResolveApiKeyTask(),
    private readonly createModel = new CreateLanguageModelTask(),
    private readonly ping = new PingLanguageModelTask(),
  ) {
    super();
  }

  async run(input: TestLlmConnectionInput): Promise<{ latencyMs: number }> {
    let apiKeyRef: string | null = null;
    if (!input.apiKey) {
      const { api } = await this.settings.get(input.workspaceId);
      if (api.provider === input.provider) apiKeyRef = api.apiKeyRef;
    }
    const apiKey = await this.resolveApiKey.run({ provider: input.provider, override: input.apiKey, apiKeyRef });
    const model = await this.createModel.run({ provider: input.provider, model: input.model, baseUrl: input.baseUrl ?? null, apiKey });
    return { latencyMs: await this.ping.run({ model, modelId: input.model }) };
  }
}
