import "server-only";
import { Action } from "@/ship/parents/Action";
import { DeleteConnectorTask } from "../Tasks/DeleteConnectorTask";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { WriteConnectorSecretsTask } from "../Tasks/WriteConnectorSecretsTask";

/** Xoá connector và mọi secret của nó. Workspace còn tham chiếu connectorId sẽ tự chọn connector khác theo ưu tiên. */
export class DeleteConnectorAction extends Action<{ connectorId: string }, void> {
  constructor(
    private readonly getConnector = new GetConnectorTask(),
    private readonly deleteConnector = new DeleteConnectorTask(),
    private readonly writeSecrets = new WriteConnectorSecretsTask(),
  ) {
    super();
  }

  async run({ connectorId }: { connectorId: string }): Promise<void> {
    const connector = await this.getConnector.run({ connectorId });
    await this.deleteConnector.run({ connectorId });
    await this.writeSecrets.run({
      connectorId,
      token: connector.has_token ? null : undefined,
      secrets: Object.fromEntries(connector.secret_keys.map((k) => [k, null])),
    });
  }
}
