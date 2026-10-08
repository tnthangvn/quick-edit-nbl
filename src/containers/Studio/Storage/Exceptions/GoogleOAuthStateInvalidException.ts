import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class GoogleOAuthStateInvalidException extends AppException {
  readonly code = "STORAGE.GOOGLE_OAUTH_STATE_INVALID";
  readonly status = 400;
}
