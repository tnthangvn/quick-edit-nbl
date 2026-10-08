import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";
import { connectorSecretRef } from "../Models/Connector";

/** Ghi / xoá secret của connector. undefined = giữ nguyên, null = xoá, chuỗi = ghi đè. */
export type WriteConnectorSecretsTaskInput = {
  connectorId: string;
  token?: string | null;
  secrets?: Record<string, string | null>;
};

export class WriteConnectorSecretsTask extends Task<WriteConnectorSecretsTaskInput, void> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run({ connectorId, token, secrets = {} }: WriteConnectorSecretsTaskInput): Promise<void> {
    const writes: [string, string | null][] = Object.entries(secrets).map(([key, value]) => [connectorSecretRef(connectorId, key), value]);
    if (token !== undefined) writes.push([connectorSecretRef(connectorId), token]);
    for (const [ref, value] of writes) {
      if (value === null) await this.store.delete(ref).catch(() => undefined);
      else await this.store.set(ref, value);
    }
  }
}
