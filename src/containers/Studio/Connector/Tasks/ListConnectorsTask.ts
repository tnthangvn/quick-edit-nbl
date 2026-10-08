import "server-only";
import { Task } from "@/ship/parents/Task";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import type { ConnectorRow } from "../Models/Connector";

export class ListConnectorsTask extends Task<void, ConnectorRow[]> {
  constructor(private readonly repo = new ConnectorRepository()) {
    super();
  }

  run(): Promise<ConnectorRow[]> {
    return this.repo.list();
  }
}
