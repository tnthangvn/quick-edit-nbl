import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class GoogleOAuthFailedException extends AppException {
  readonly code = "STORAGE.GOOGLE_OAUTH_FAILED";
  readonly status = 502;
}
