import "server-only";
import type { RowPatch } from "@/ship/contracts/data";
import type { GitProvider } from "@/ship/contracts/enums/sync";
import { Action } from "@/ship/parents/Action";
import type { McpTransport } from "../Enums/McpTransport";
import type { ConnectorView } from "../Models/Connector";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { UpdateConnectorTask } from "../Tasks/UpdateConnectorTask";
import { MaskConnectorTokensTask } from "../Tasks/MaskConnectorTokensTask";
import { WriteConnectorSecretsTask } from "../Tasks/WriteConnectorSecretsTask";

export type UpdateConnectorInput = {
  connectorId: string;
  name?: string;
  provider?: GitProvider;
  host?: string | null;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: McpTransport;
  url?: string;
  headers?: Record<string, string>;
  /** null = xoá secret đó. */
  secrets?: Record<string, string | null>;
  /** null = xoá token. */
  token?: string | null;
  agentTools?: string[];
};

/** Sửa connector; loại connector không đổi được (xoá rồi tạo mới). Đổi cấu hình thì kết quả Kiểm tra cũ bị xoá. */
export class UpdateConnectorAction extends Action<UpdateConnectorInput, ConnectorView> {
  constructor(
    private readonly getConnector = new GetConnectorTask(),
    private readonly updateConnector = new UpdateConnectorTask(),
    private readonly writeSecrets = new WriteConnectorSecretsTask(),
    private readonly maskTokens = new MaskConnectorTokensTask(),
  ) {
    super();
  }

  async run({ connectorId, secrets, token, agentTools, ...input }: UpdateConnectorInput): Promise<ConnectorView> {
    const current = await this.getConnector.run({ connectorId });
    const isMcp = current.type === "MCP";
    const isToken = current.type === "TOKEN";
    await this.writeSecrets.run({ connectorId, token: isToken ? token : undefined, secrets: isMcp ? secrets : undefined });

    const patch: RowPatch<"connectors"> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.provider !== undefined) patch.provider = input.provider;
    if (input.host !== undefined) patch.host = input.host;
    if (input.command !== undefined && (current.type === "CLI" || isMcp)) patch.command = input.command;
    if (isMcp) {
      if (input.args !== undefined) patch.args = input.args;
      if (input.env !== undefined) patch.env = input.env;
      if (input.transport !== undefined) patch.transport = input.transport;
      if (input.url !== undefined) patch.url = input.url;
      if (input.headers !== undefined) patch.headers = input.headers;
      if (agentTools !== undefined) patch.agent_tools = agentTools;
      if (secrets) {
        const keys = new Set(current.secret_keys);
        for (const [key, value] of Object.entries(secrets)) {
          if (value === null) keys.delete(key);
          else keys.add(key);
        }
        patch.secret_keys = [...keys];
      }
    }
    if (isToken && token !== undefined) patch.has_token = token !== null;

    const configChanged = Object.keys(patch).some((k) => k !== "name" && k !== "agent_tools");
    if (configChanged) Object.assign(patch, { status: null, account: null, scopes: [], checked_at: null });
    const [view] = await this.maskTokens.run({ rows: [await this.updateConnector.run({ connectorId, patch })] });
    return view;
  }
}
