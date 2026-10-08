import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { ListConnectorToolsTask } from "../Tasks/ListConnectorToolsTask";

export type ConnectorToolItem = { name: string; description: string | null; enabled: boolean };

/** Tool của MCP server kèm cờ đã cấp cho AI Agent hay chưa (bật/tắt qua PATCH agentTools). */
export class ListConnectorToolsAction extends Action<{ connectorId: string }, ConnectorToolItem[]> {
  constructor(
    private readonly getConnector = new GetConnectorTask(),
    private readonly listTools = new ListConnectorToolsTask(),
  ) {
    super();
  }

  async run({ connectorId }: { connectorId: string }): Promise<ConnectorToolItem[]> {
    const connector = await this.getConnector.run({ connectorId });
    const enabled = new Set(connector.agent_tools);
    return (await this.listTools.run({ connector })).map((t) => ({ ...t, enabled: enabled.has(t.name) }));
  }
}
