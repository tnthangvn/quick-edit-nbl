import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class PushRejectedException extends AppException {
  readonly code = "STORAGE.PUSH_REJECTED";
  readonly status = 409;
}
