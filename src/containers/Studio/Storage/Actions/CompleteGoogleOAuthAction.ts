import "server-only";
import { Action } from "@/ship/parents/Action";
import { GoogleOAuthFailedException } from "../Exceptions/GoogleOAuthFailedException";
import { CompleteGoogleOAuthTask } from "../Tasks/CompleteGoogleOAuthTask";

export type CompleteGoogleOAuthInput = { code?: string; state: string; error?: string };

/**
 * Callback OAuth: người dùng từ chối / thiếu code → STORAGE.GOOGLE_OAUTH_FAILED; thành công thì lưu refresh token
 * (JSON {"refresh_token"}) vào secret đã gắn với state lúc bắt đầu.
 */
export class CompleteGoogleOAuthAction extends Action<CompleteGoogleOAuthInput, { configured: boolean; connected: boolean }> {
  constructor(private readonly complete = new CompleteGoogleOAuthTask()) {
    super();
  }

  async run({ code, state, error }: CompleteGoogleOAuthInput): Promise<{ configured: boolean; connected: boolean }> {
    if (error || !code) throw new GoogleOAuthFailedException({ detail: (error ?? "missing code").slice(0, 100) });
    await this.complete.run({ code, state });
    return { configured: true, connected: true };
  }
}
