import "server-only";
import { maskSecret } from "@/ship/adapters/cipher";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";

/** Bản che của từng ref (vd "ghp_••••••••a1b2"), null nếu chưa có. Không bao giờ trả plaintext. */
export class MaskSecretsTask extends Task<{ refs: string[] }, Record<string, string | null>> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run({ refs }: { refs: string[] }): Promise<Record<string, string | null>> {
    const values = await Promise.all(refs.map((ref) => this.store.get(ref)));
    return Object.fromEntries(refs.map((ref, i) => [ref, values[i] ? maskSecret(values[i]) : null]));
  }
}
