import "server-only";
import { v7 as uuidv7 } from "uuid";
import type { ConnectorType, GitProvider } from "@/ship/contracts/enums/sync";
import { Action } from "@/ship/parents/Action";
import type { McpTransport } from "../Enums/McpTransport";
import { KNOWN_CLIS } from "../Gateways/cliTools";
import type { ConnectorRow } from "../Models/Connector";
import { CreateConnectorTask } from "../Tasks/CreateConnectorTask";
import { WriteConnectorSecretsTask } from "../Tasks/WriteConnectorSecretsTask";

export type CreateConnectorInput = {
  name: string;
  type: ConnectorType;
  provider: GitProvider;
  host: string | null;
  command: string | null;
  args: string[];
  env: Record<string, string>;
  transport: McpTransport | null;
  url: string | null;
  headers: Record<string, string>;
  /** Giá trị env (stdio) / header (HTTP) bí mật của MCP — chỉ ghi vào secret store. */
  secrets: Record<string, string>;
  /** PAT cho connector TOKEN — chỉ ghi vào secret store. */
  token?: string;
  agentTools: string[];
};

/** Thêm connector (Tab 5 / Wizard). Secret ghi vào secret store trước, bản ghi chỉ giữ tên khoá. */
export class CreateConnectorAction extends Action<CreateConnectorInput, ConnectorRow> {
  constructor(
    private readonly createConnector = new CreateConnectorTask(),
    private readonly writeSecrets = new WriteConnectorSecretsTask(),
  ) {
    super();
  }

  async run({ secrets, token, agentTools, ...input }: CreateConnectorInput): Promise<ConnectorRow> {
    const id = uuidv7();
    const isMcp = input.type === "MCP";
    await this.writeSecrets.run({ connectorId: id, token: input.type === "TOKEN" ? token : undefined, secrets: isMcp ? secrets : {} });
    return this.createConnector.run({
      id,
      name: input.name,
      type: input.type,
      provider: input.provider,
      host: input.host,
      command:
        input.type === "CLI"
          ? (input.command ?? KNOWN_CLIS.find((c) => c.provider === input.provider)?.binary ?? null)
          : isMcp && input.transport === "STDIO"
            ? input.command
            : null,
      args: isMcp ? input.args : [],
      env: isMcp ? input.env : {},
      transport: isMcp ? input.transport : null,
      url: isMcp && input.transport === "HTTP" ? input.url : null,
      headers: isMcp ? input.headers : {},
      secret_keys: isMcp ? Object.keys(secrets) : [],
      agent_tools: isMcp ? agentTools : [],
      has_token: input.type === "TOKEN" && !!token,
      status: null,
      account: null,
      scopes: [],
      checked_at: null,
    });
  }
}
