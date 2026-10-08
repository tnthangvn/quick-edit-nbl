import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorNotFoundException extends AppException {
  readonly code = "CONNECTOR.NOT_FOUND";
  readonly status = 404;
}
