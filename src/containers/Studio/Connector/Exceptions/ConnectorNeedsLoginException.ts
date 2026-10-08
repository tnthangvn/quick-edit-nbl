import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorNeedsLoginException extends AppException {
  readonly code = "CONNECTOR.NEEDS_LOGIN";
  readonly status = 401;
}
