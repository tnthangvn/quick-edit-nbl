import "server-only";
import { Task } from "@/ship/parents/Task";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import { ConnectorNotFoundException } from "../Exceptions/ConnectorNotFoundException";

export class DeleteConnectorTask extends Task<{ connectorId: string }, void> {
  constructor(private readonly repo = new ConnectorRepository()) {
    super();
  }

  async run({ connectorId }: { connectorId: string }): Promise<void> {
    if (!(await this.repo.remove(connectorId))) throw new ConnectorNotFoundException({ connectorId });
  }
}
