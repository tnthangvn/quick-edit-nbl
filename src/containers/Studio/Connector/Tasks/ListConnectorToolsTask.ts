import "server-only";
import type { McpToolInfo } from "@/ship/adapters/mcp";
import { Task } from "@/ship/parents/Task";
import { ConnectorGateway } from "../Gateways/ConnectorGateway";
import { defaultConnectorDeps, type ConnectorDeps } from "../Gateways/deps";
import type { ConnectorRow } from "../Models/Connector";

/** Danh sách tool của MCP server (Tab 5). Connector khác MCP → CONNECTOR.NOT_SUPPORTED. */
export class ListConnectorToolsTask extends Task<{ connector: ConnectorRow }, McpToolInfo[]> {
  constructor(private readonly deps: ConnectorDeps = defaultConnectorDeps()) {
    super();
  }

  run({ connector }: { connector: ConnectorRow }): Promise<McpToolInfo[]> {
    return new ConnectorGateway(connector, this.deps).listTools();
  }
}
