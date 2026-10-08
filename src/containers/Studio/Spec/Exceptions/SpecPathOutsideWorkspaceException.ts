import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class SpecPathOutsideWorkspaceException extends AppException {
  readonly code = "SPEC.PATH_OUTSIDE_WORKSPACE";
  readonly status = 403;
}
