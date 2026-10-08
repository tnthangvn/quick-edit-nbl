import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class GoogleAuthRequiredException extends AppException {
  readonly code = "STORAGE.GOOGLE_AUTH_REQUIRED";
  readonly status = 401;
}
