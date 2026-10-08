import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class SpecInvalidNameException extends AppException {
  readonly code = "SPEC.INVALID_NAME";
  readonly status = 400;
}
