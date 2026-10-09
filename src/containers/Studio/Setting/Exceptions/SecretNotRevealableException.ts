import "server-only";
import { AppException } from "@/ship/parents/AppException";

/** Secret do hệ thống cấp (vd refresh token Google OAuth) không được xem lại. */
export class SecretNotRevealableException extends AppException {
  readonly code = "SETTING.SECRET_NOT_REVEALABLE";
  readonly status = 403;
}
