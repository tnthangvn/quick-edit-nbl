import "server-only";
import type { RowPatch } from "@/ship/contracts/data";
import { Task } from "@/ship/parents/Task";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import { ConnectorNotFoundException } from "../Exceptions/ConnectorNotFoundException";
import type { ConnectorRow } from "../Models/Connector";

export type UpdateConnectorTaskInput = { connectorId: string; patch: RowPatch<"connectors"> };

export class UpdateConnectorTask extends Task<UpdateConnectorTaskInput, ConnectorRow> {
  constructor(private readonly repo = new ConnectorRepository()) {
    super();
  }

  async run({ connectorId, patch }: UpdateConnectorTaskInput): Promise<ConnectorRow> {
    const row = await this.repo.patch(connectorId, patch);
    if (!row) throw new ConnectorNotFoundException({ connectorId });
    return row;
  }
}
