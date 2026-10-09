import "server-only";
import { Action } from "@/ship/parents/Action";
import { SecretNotSetException } from "../Exceptions/SecretNotSetException";
import { GetAgentSettingsTask } from "../Tasks/GetAgentSettingsTask";
import { ReadSecretTask } from "../Tasks/ReadSecretTask";

/** Nút Hiện ở Direct API: trả API key của provider đang chọn (plaintext, chỉ qua endpoint reveal). */
export class RevealApiKeyAction extends Action<void, { value: string }> {
  constructor(
    private readonly getAgentSettings = new GetAgentSettingsTask(),
    private readonly readSecret = new ReadSecretTask(),
  ) {
    super();
  }

  async run(): Promise<{ value: string }> {
    const { api } = await this.getAgentSettings.run();
    const value = api.apiKeyRef ? await this.readSecret.run({ ref: api.apiKeyRef }) : undefined;
    if (!value) throw new SecretNotSetException({ kind: "LLM_API_KEY" });
    return { value };
  }
}
