import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class SecretNotSetException extends AppException {
  readonly code = "SETTING.SECRET_NOT_SET";
  readonly status = 400;
}
