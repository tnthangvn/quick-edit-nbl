import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorCliNotFoundException extends AppException {
  readonly code = "CONNECTOR.CLI_NOT_FOUND";
  readonly status = 400;
}
