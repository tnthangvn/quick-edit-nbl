import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class SpecsDirNotFoundException extends AppException {
  readonly code = "SPEC.SPECS_DIR_NOT_FOUND";
  readonly status = 404;
}
