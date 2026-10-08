import "server-only";
import type { NewRow, RowPatch } from "@/ship/contracts/data";
import { RepositoryBase } from "@/ship/parents/RepositoryBase";
import type { ConnectorRow } from "../../Models/Connector";

export class ConnectorRepository extends RepositoryBase<"connectors"> {
  protected readonly model = "connectors" as const;

  list(): Promise<ConnectorRow[]> {
    return this.findMany({}, { orderBy: [["created_at", "asc"]] });
  }

  findByIdOrNull(id: string): Promise<ConnectorRow | undefined> {
    return this.findById(id);
  }

  create(row: NewRow<"connectors">): Promise<ConnectorRow> {
    return this.insert(row);
  }

  async patch(id: string, patch: RowPatch<"connectors">): Promise<ConnectorRow | undefined> {
    await this.updateById(id, patch);
    return this.findById(id);
  }

  async remove(id: string): Promise<boolean> {
    return (await this.deleteById(id)) > 0;
  }
}
