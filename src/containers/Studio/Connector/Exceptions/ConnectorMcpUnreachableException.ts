import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorMcpUnreachableException extends AppException {
  readonly code = "CONNECTOR.MCP_UNREACHABLE";
  readonly status = 502;
}
