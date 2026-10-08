import "server-only";
import type { NewRow } from "@/ship/contracts/data";
import { Task } from "@/ship/parents/Task";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import type { ConnectorRow } from "../Models/Connector";

export class CreateConnectorTask extends Task<NewRow<"connectors">, ConnectorRow> {
  constructor(private readonly repo = new ConnectorRepository()) {
    super();
  }

  run(row: NewRow<"connectors">): Promise<ConnectorRow> {
    return this.repo.create(row);
  }
}
