import "server-only";
import { Task } from "@/ship/parents/Task";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import { ConnectorNotFoundException } from "../Exceptions/ConnectorNotFoundException";
import type { ConnectorRow } from "../Models/Connector";

/** Lấy connector theo id, không có thì CONNECTOR.NOT_FOUND. */
export class GetConnectorTask extends Task<{ connectorId: string }, ConnectorRow> {
  constructor(private readonly repo = new ConnectorRepository()) {
    super();
  }

  async run({ connectorId }: { connectorId: string }): Promise<ConnectorRow> {
    const row = await this.repo.findByIdOrNull(connectorId);
    if (!row) throw new ConnectorNotFoundException({ connectorId });
    return row;
  }
}
