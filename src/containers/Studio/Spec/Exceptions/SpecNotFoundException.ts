import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class SpecNotFoundException extends AppException {
  readonly code = "SPEC.NOT_FOUND";
  readonly status = 404;
}
