import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";
import { NOTEBOOK_COOKIE_REF } from "../Models/notebookCredentials";

/** Ghi (chuỗi đã chuẩn hoá) hoặc xoá (null) cookie NotebookLM dùng chung; secret store tự mã hoá. */
export class WriteNotebookCookieTask extends Task<{ cookie: string | null }, void> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run({ cookie }: { cookie: string | null }): Promise<void> {
    if (cookie === null) await this.store.delete(NOTEBOOK_COOKIE_REF);
    else await this.store.set(NOTEBOOK_COOKIE_REF, cookie);
  }
}
