import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";
import { connectorSecretRef } from "../Models/Connector";

/** Token PAT của connector (plaintext), chỉ dùng cho endpoint reveal. */
export class ReadConnectorTokenTask extends Task<{ connectorId: string }, string | undefined> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  run({ connectorId }: { connectorId: string }): Promise<string | undefined> {
    return this.store.get(connectorSecretRef(connectorId));
  }
}
