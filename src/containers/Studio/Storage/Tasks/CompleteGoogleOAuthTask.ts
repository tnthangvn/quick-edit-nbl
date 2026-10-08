import "server-only";
import { completeGoogleAuth, GoogleError } from "@/ship/adapters/google";
import { Task } from "@/ship/parents/Task";
import { GoogleOAuthFailedException } from "../Exceptions/GoogleOAuthFailedException";
import { GoogleOAuthStateInvalidException } from "../Exceptions/GoogleOAuthStateInvalidException";
import { googleFailure } from "../Exceptions/mapFailures";

/** Đổi `code` lấy refresh token (lưu vào secret store), trả ref đã lưu. */
export class CompleteGoogleOAuthTask extends Task<{ code: string; state: string }, { secretRef: string }> {
  async run({ code, state }: { code: string; state: string }): Promise<{ secretRef: string }> {
    try {
      return await completeGoogleAuth(code, state);
    } catch (err) {
      if (err instanceof GoogleError && err.kind === "UNAUTHORIZED") throw new GoogleOAuthStateInvalidException();
      if (err instanceof GoogleError && err.kind === "FAILED") throw new GoogleOAuthFailedException(err.detail ? { detail: err.detail } : undefined);
      throw googleFailure(err);
    }
  }
}
