import "server-only";
import { secrets } from "@/ship/adapters/secrets";
import type { LlmProvider } from "@/ship/contracts/enums/agent";
import { Task } from "@/ship/parents/Task";
import { ApiKeyMissingException } from "../Exceptions/LlmExceptions";

export type ResolveApiKeyInput = {
  provider: LlmProvider;
  /** Key người dùng vừa nhập (nút Test trong Settings), ưu tiên hơn key đã lưu. */
  override?: string;
  apiKeyRef: string | null;
};

/** Lấy API key thật từ secret store. OLLAMA không bắt buộc key; provider khác thiếu key → AGENT.API_KEY_MISSING. */
export class ResolveApiKeyTask extends Task<ResolveApiKeyInput, string | undefined> {
  constructor(private readonly store = secrets) {
    super();
  }

  async run({ provider, override, apiKeyRef }: ResolveApiKeyInput): Promise<string | undefined> {
    const key = override || (apiKeyRef ? await this.store.get(apiKeyRef) : undefined);
    if (!key && provider !== "OLLAMA") throw new ApiKeyMissingException({ provider });
    return key || undefined;
  }
}
