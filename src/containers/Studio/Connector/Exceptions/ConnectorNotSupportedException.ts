import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorNotSupportedException extends AppException {
  readonly code = "CONNECTOR.NOT_SUPPORTED";
  readonly status = 400;
}
