import "server-only";
import { Action } from "@/ship/parents/Action";
import type { ConnectorView } from "../Models/Connector";
import { ListConnectorsTask } from "../Tasks/ListConnectorsTask";
import { MaskConnectorTokensTask } from "../Tasks/MaskConnectorTokensTask";

export class ListConnectorsAction extends Action<void, ConnectorView[]> {
  constructor(
    private readonly listConnectors = new ListConnectorsTask(),
    private readonly maskTokens = new MaskConnectorTokensTask(),
  ) {
    super();
  }

  async run(): Promise<ConnectorView[]> {
    return this.maskTokens.run({ rows: await this.listConnectors.run() });
  }
}
