import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorTokenMissingException extends AppException {
  readonly code = "CONNECTOR.TOKEN_MISSING";
  readonly status = 400;
}
