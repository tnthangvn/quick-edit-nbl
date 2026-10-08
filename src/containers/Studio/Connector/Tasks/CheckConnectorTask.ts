import "server-only";
import { Task } from "@/ship/parents/Task";
import { ConnectorGateway, type ConnectorCheckResult } from "../Gateways/ConnectorGateway";
import { defaultConnectorDeps, type ConnectorDeps } from "../Gateways/deps";
import type { ConnectorRow } from "../Models/Connector";

/** Nút Kiểm tra: tài khoản, host, phạm vi quyền, trạng thái. Không ném lỗi với các trạng thái dự kiến. */
export class CheckConnectorTask extends Task<{ connector: ConnectorRow }, ConnectorCheckResult> {
  constructor(private readonly deps: ConnectorDeps = defaultConnectorDeps()) {
    super();
  }

  run({ connector }: { connector: ConnectorRow }): Promise<ConnectorCheckResult> {
    return new ConnectorGateway(connector, this.deps).check();
  }
}
