import "server-only";
import { AppException } from "@/ship/parents/AppException";

export class ConnectorMcpToolMissingException extends AppException {
  readonly code = "CONNECTOR.MCP_TOOL_MISSING";
  readonly status = 400;
}
