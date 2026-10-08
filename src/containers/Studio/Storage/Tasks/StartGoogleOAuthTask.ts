import "server-only";
import { createGoogleAuthUrl } from "@/ship/adapters/google";
import { Task } from "@/ship/parents/Task";
import { googleFailure } from "../Exceptions/mapFailures";

/** URL màn hình đồng ý của Google (Drive). redirectUri = <origin>/api/google/oauth/callback; token lưu vào secretRef. */
export class StartGoogleOAuthTask extends Task<{ redirectUri: string; secretRef: string }, { authUrl: string }> {
  async run({ redirectUri, secretRef }: { redirectUri: string; secretRef: string }): Promise<{ authUrl: string }> {
    try {
      return { authUrl: createGoogleAuthUrl(redirectUri, secretRef) };
    } catch (err) {
      throw googleFailure(err);
    }
  }
}
