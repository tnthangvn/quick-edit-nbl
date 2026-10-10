import "server-only";
import { maskSecret } from "@/ship/adapters/cipher";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";
import { NOTEBOOK_COOKIE_REF } from "../Models/notebookCredentials";

/** Trạng thái cookie NotebookLM dùng chung: đã có chưa + bản che (không bao giờ plaintext). */
export class ReadNotebookConnectionTask extends Task<void, { isSet: boolean; masked: string | null }> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run(): Promise<{ isSet: boolean; masked: string | null }> {
    const value = await this.store.get(NOTEBOOK_COOKIE_REF);
    return value ? { isSet: true, masked: maskSecret(value) } : { isSet: false, masked: null };
  }
}
