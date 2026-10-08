import "server-only";
import { Action } from "@/ship/parents/Action";
import type { ConnectorCheckResult } from "../Gateways/ConnectorGateway";
import { CheckConnectorTask } from "../Tasks/CheckConnectorTask";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { UpdateConnectorTask } from "../Tasks/UpdateConnectorTask";

export type CheckConnectorOutput = ConnectorCheckResult & { checkedAt: string };

/** Nút Kiểm tra: chạy kiểm tra và lưu kết quả vào connector để danh sách hiện trạng thái. */
export class CheckConnectorAction extends Action<{ connectorId: string }, CheckConnectorOutput> {
  constructor(
    private readonly getConnector = new GetConnectorTask(),
    private readonly checkConnector = new CheckConnectorTask(),
    private readonly updateConnector = new UpdateConnectorTask(),
  ) {
    super();
  }

  async run({ connectorId }: { connectorId: string }): Promise<CheckConnectorOutput> {
    const connector = await this.getConnector.run({ connectorId });
    const result = await this.checkConnector.run({ connector });
    const checkedAt = new Date().toISOString();
    await this.updateConnector.run({
      connectorId,
      patch: { status: result.status, account: result.account, scopes: result.scopes, checked_at: checkedAt },
    });
    return { ...result, checkedAt };
  }
}
