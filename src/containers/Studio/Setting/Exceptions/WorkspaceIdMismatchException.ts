import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class WorkspaceIdMismatchException extends AppException {
  readonly code = "SETTING.WORKSPACE_ID_MISMATCH";
  readonly status = 400;
}
