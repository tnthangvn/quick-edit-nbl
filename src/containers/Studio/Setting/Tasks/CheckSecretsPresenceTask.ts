import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";

/** Ref nào đã có giá trị (chỉ trả boolean, không bao giờ trả giá trị). */
export class CheckSecretsPresenceTask extends Task<{ refs: string[] }, Record<string, boolean>> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run({ refs }: { refs: string[] }): Promise<Record<string, boolean>> {
    const values = await Promise.all(refs.map((ref) => this.store.get(ref)));
    return Object.fromEntries(refs.map((ref, i) => [ref, !!values[i]]));
  }
}
