import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { Task } from "@/ship/parents/Task";

/**
 * Ngắt kết nối Google: xoá refresh token ở đúng ref (Workspace hoặc dùng chung) khỏi secret store.
 * Không revoke phía Google vì cùng một grant có thể đang được ref khác dùng; người dùng tự thu hồi ở myaccount.google.com nếu cần.
 */
export class DisconnectGoogleOAuthTask extends Task<{ secretRef: string }, void> {
  constructor(private readonly store: SecretStore = defaultSecrets) {
    super();
  }

  async run({ secretRef }: { secretRef: string }): Promise<void> {
    await this.store.delete(secretRef);
  }
}
