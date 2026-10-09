import "server-only";
import { Action } from "@/ship/parents/Action";
import { ConnectorTokenMissingException } from "../Exceptions/ConnectorTokenMissingException";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { ReadConnectorTokenTask } from "../Tasks/ReadConnectorTokenTask";

/** Nút Hiện token PAT của connector TOKEN (plaintext, chỉ qua endpoint reveal). */
export class RevealConnectorTokenAction extends Action<{ connectorId: string }, { value: string }> {
  constructor(
    private readonly getConnector = new GetConnectorTask(),
    private readonly readToken = new ReadConnectorTokenTask(),
  ) {
    super();
  }

  async run({ connectorId }: { connectorId: string }): Promise<{ value: string }> {
    await this.getConnector.run({ connectorId }); // CONNECTOR.NOT_FOUND (404)
    const value = await this.readToken.run({ connectorId });
    if (!value) throw new ConnectorTokenMissingException();
    return { value };
  }
}
