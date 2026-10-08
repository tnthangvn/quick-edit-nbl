import "server-only";
import { Action } from "@/ship/parents/Action";
import type { ConnectorRow } from "../Models/Connector";
import { ListConnectorsTask } from "../Tasks/ListConnectorsTask";

export class ListConnectorsAction extends Action<void, ConnectorRow[]> {
  constructor(private readonly listConnectors = new ListConnectorsTask()) {
    super();
  }

  run(): Promise<ConnectorRow[]> {
    return this.listConnectors.run();
  }
}
