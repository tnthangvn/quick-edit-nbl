import "server-only";
import { Task } from "@/ship/parents/Task";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import { ConnectorNotFoundException } from "../Exceptions/ConnectorNotFoundException";
import { ConnectorGateway } from "../Gateways/ConnectorGateway";
import { defaultConnectorDeps, type ConnectorDeps } from "../Gateways/deps";
import { isHttpRemote, remoteHost } from "../Gateways/remote";
import { CONNECTOR_PRIORITY, type ConnectorRow } from "../Models/Connector";

/**
 * Chuẩn bị xác thực cho git (clone/pull/push) theo connector: CLI → token tạm (gh auth token), TOKEN → PAT, SSH → giữ nguyên remote. Trả env cho tiến trình git và remote URL dùng được.
 * Token đi qua GIT_CONFIG_* (http.<url>.extraHeader, chỉ áp cho đúng host) nên không bị ghi vào URL, .git/config hay log.
 * connectorId = null → tự chọn connector cùng host theo thứ tự ưu tiên CLI → MCP → Token → SSH; không có thì dùng
 * credential helper / ssh-agent sẵn có của máy.
 */
export type ResolveGitCredentialsTaskInput = { connectorId: string | null; remote: string };
export type ResolveGitCredentialsTaskOutput = { env: Record<string, string>; remoteUrl: string };

export class ResolveGitCredentialsTask extends Task<ResolveGitCredentialsTaskInput, ResolveGitCredentialsTaskOutput> {
  constructor(
    private readonly repo = new ConnectorRepository(),
    private readonly deps: ConnectorDeps = defaultConnectorDeps(),
  ) {
    super();
  }

  async run({ connectorId, remote }: ResolveGitCredentialsTaskInput): Promise<ResolveGitCredentialsTaskOutput> {
    const env: Record<string, string> = { GIT_TERMINAL_PROMPT: "0" };
    const host = remoteHost(remote);
    if (!isHttpRemote(remote) || !host) return { env, remoteUrl: remote };

    const authorization = await this.authorizationFor(connectorId, host);
    if (authorization) {
      const origin = `${new URL(remote).protocol}//${host}/`;
      Object.assign(env, {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: `http.${origin}.extraHeader`,
        GIT_CONFIG_VALUE_0: `Authorization: ${authorization}`,
      });
    }
    return { env, remoteUrl: remote };
  }

  private async authorizationFor(connectorId: string | null, host: string): Promise<string | undefined> {
    if (connectorId) {
      const connector = await this.repo.findByIdOrNull(connectorId);
      if (!connector) throw new ConnectorNotFoundException({ connectorId });
      return new ConnectorGateway(connector, this.deps).gitAuthorization();
    }
    for (const connector of this.candidates(await this.repo.list(), host)) {
      try {
        const auth = await new ConnectorGateway(connector, this.deps).gitAuthorization();
        if (auth) return auth;
      } catch {
        // Connector này không lấy được token (CLI chưa đăng nhập...): thử connector kế tiếp.
      }
    }
    return undefined;
  }

  private candidates(connectors: ConnectorRow[], host: string): ConnectorRow[] {
    return connectors
      .filter((c) => (c.type === "CLI" || c.type === "TOKEN") && new ConnectorGateway(c, this.deps).host === host)
      .sort((a, b) => CONNECTOR_PRIORITY[a.type] - CONNECTOR_PRIORITY[b.type]);
  }
}
