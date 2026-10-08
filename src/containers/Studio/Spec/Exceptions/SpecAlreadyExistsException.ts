import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class SpecAlreadyExistsException extends AppException {
  readonly code = "SPEC.ALREADY_EXISTS";
  readonly status = 409;
}
