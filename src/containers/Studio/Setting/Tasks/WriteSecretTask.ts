import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";

/** Ghi (value là chuỗi) hoặc xoá (value = null) một secret theo ref. Không log giá trị. */
export class WriteSecretTask extends Task<{ ref: string; value: string | null }, void> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run({ ref, value }: { ref: string; value: string | null }): Promise<void> {
    if (value === null) await this.store.delete(ref).catch(() => undefined);
    else await this.store.set(ref, value);
  }
}
