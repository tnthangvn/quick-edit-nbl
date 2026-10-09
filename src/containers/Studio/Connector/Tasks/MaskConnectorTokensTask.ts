import "server-only";
import { maskSecret } from "@/ship/adapters/cipher";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";
import { connectorSecretRef, type ConnectorRow, type ConnectorView } from "../Models/Connector";

/** Gắn bản che token PAT vào connector để trả ra API (không bao giờ plaintext). */
export class MaskConnectorTokensTask extends Task<{ rows: ConnectorRow[] }, ConnectorView[]> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run({ rows }: { rows: ConnectorRow[] }): Promise<ConnectorView[]> {
    return Promise.all(
      rows.map(async (row) => {
        const token = row.has_token ? await this.store.get(connectorSecretRef(row.id)) : undefined;
        return { ...row, token_masked: token ? maskSecret(token) : null };
      }),
    );
  }
}
