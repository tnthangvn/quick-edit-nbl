import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class GoogleNotConfiguredException extends AppException {
  readonly code = "STORAGE.GOOGLE_NOT_CONFIGURED";
  readonly status = 503;
}
