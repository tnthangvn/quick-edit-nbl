import { z } from "zod";
import { ConnectorType, GitProvider } from "@/ship/contracts/enums/sync";
import { ConnectorStatus } from "../Enums/ConnectorStatus";
import { McpTransport } from "../Enums/McpTransport";

/**
 * Connector tới Git provider (spec 3.0.2), dùng chung cho mọi Workspace (model connectors).
 * Không chứa secret: token / giá trị env-header bí mật nằm trong secret store theo ref (xem connectorSecretRef).
 */
export const ConnectorRow = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: ConnectorType,
  provider: GitProvider,
  /** Host Git (github.com, gitlab.company.vn); null = host mặc định của provider. */
  host: z.string().nullable(),
  /** CLI: binary (gh / glab / tea / đường dẫn); MCP stdio: lệnh chạy server. */
  command: z.string().nullable(),
  args: z.array(z.string()),
  /** Biến môi trường không bí mật cho MCP stdio. */
  env: z.record(z.string(), z.string()),
  transport: McpTransport.nullable(),
  url: z.string().nullable(),
  /** Header không bí mật cho MCP HTTP. */
  headers: z.record(z.string(), z.string()),
  /** Tên env (stdio) / header (HTTP) có giá trị nằm trong secret store. */
  secret_keys: z.array(z.string()),
  /** Tool MCP được cấp cho AI Agent (mặc định không có). */
  agent_tools: z.array(z.string()),
  has_token: z.boolean(),
  status: ConnectorStatus.nullable(),
  account: z.string().nullable(),
  scopes: z.array(z.string()),
  checked_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ConnectorRow = z.infer<typeof ConnectorRow>;

declare module "@/ship/contracts/data" {
  interface DataModels {
    connectors: ConnectorRow;
  }
}

/** Connector kèm bản che token PAT (vd "ghp_••••••••a1b2"); null khi không có token. Trả ra API thay cho plaintext. */
export type ConnectorView = ConnectorRow & { token_masked: string | null };

/** Ref secret: token PAT = "connector:<id>:token"; env/header bí mật = "connector:<id>:secret:<KEY>". */
export const connectorSecretRef = (connectorId: string, key?: string) =>
  key === undefined ? `connector:${connectorId}:token` : `connector:${connectorId}:secret:${key}`;

/** Thứ tự ưu tiên khi Workspace có nhiều cách xác thực (spec 3.0.2): CLI → MCP → Token → SSH. */
export const CONNECTOR_PRIORITY: Record<ConnectorType, number> = { CLI: 0, MCP: 1, TOKEN: 2, SSH: 3 };
