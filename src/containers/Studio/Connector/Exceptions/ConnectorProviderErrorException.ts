import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorProviderErrorException extends AppException {
  readonly code = "CONNECTOR.PROVIDER_ERROR";
  readonly status = 502;
}
