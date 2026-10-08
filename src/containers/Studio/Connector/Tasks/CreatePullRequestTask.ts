import "server-only";
import { Task } from "@/ship/parents/Task";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import { ConnectorNotFoundException } from "../Exceptions/ConnectorNotFoundException";
import { ConnectorGateway } from "../Gateways/ConnectorGateway";
import { defaultConnectorDeps, type ConnectorDeps } from "../Gateways/deps";
import { CONNECTOR_PRIORITY } from "../Models/Connector";

/**
 * Tạo (hoặc trả PR đang mở cho cùng head) Pull/Merge Request qua connector (gh / glab / MCP / REST).
 * CLI dùng token tạm của CLI để gọi REST của provider (không cần cwd là repo local).
 * connectorId = null → connector đầu tiên có thể tạo PR theo ưu tiên CLI → MCP → Token.
 */
export type CreatePullRequestTaskInput = { connectorId: string | null; repo: string; head: string; base: string; title: string; body: string };
export type CreatePullRequestTaskOutput = { number: number; url: string; created: boolean };

export class CreatePullRequestTask extends Task<CreatePullRequestTaskInput, CreatePullRequestTaskOutput> {
  constructor(
    private readonly repo = new ConnectorRepository(),
    private readonly deps: ConnectorDeps = defaultConnectorDeps(),
  ) {
    super();
  }

  async run({ connectorId, ...pr }: CreatePullRequestTaskInput): Promise<CreatePullRequestTaskOutput> {
    const connector = connectorId
      ? await this.repo.findByIdOrNull(connectorId)
      : (await this.repo.list()).filter((c) => c.type !== "SSH").sort((a, b) => CONNECTOR_PRIORITY[a.type] - CONNECTOR_PRIORITY[b.type])[0];
    if (!connector) throw new ConnectorNotFoundException({ connectorId: connectorId ?? "" });
    const { number, url, created } = await new ConnectorGateway(connector, this.deps).ensurePullRequest(pr);
    return { number, url, created };
  }
}
