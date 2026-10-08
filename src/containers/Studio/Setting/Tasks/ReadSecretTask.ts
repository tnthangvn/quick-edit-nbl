import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";

/**
 * Đọc giá trị secret theo ref (vd workspaceSecretRef(id, "NOTEBOOK_COOKIE")) cho container khác trong Section Studio.
 * Chỉ dùng nội bộ BE, không trả ra API.
 */
export class ReadSecretTask extends Task<{ ref: string }, string | undefined> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  run({ ref }: { ref: string }): Promise<string | undefined> {
    return this.store.get(ref);
  }
}
