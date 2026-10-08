import "server-only";
import { z } from "zod";
import { ConnectorType, GitProvider } from "@/ship/contracts/enums/sync";
import { Transformer } from "@/ship/parents/Transformer";
import { ConnectorStatus } from "../../../Enums/ConnectorStatus";
import { McpTransport } from "../../../Enums/McpTransport";
import type { ConnectorRow } from "../../../Models/Connector";

/** DTO connector. Không bao giờ chứa secret: chỉ tên khoá bí mật (secretKeys) và cờ hasToken. */
export const ConnectorResponse = z
  .object({
    id: z.string(),
    name: z.string(),
    type: ConnectorType,
    provider: GitProvider,
    host: z.string().nullable(),
    command: z.string().nullable(),
    args: z.array(z.string()),
    env: z.record(z.string(), z.string()),
    transport: McpTransport.nullable(),
    url: z.string().nullable(),
    headers: z.record(z.string(), z.string()),
    secretKeys: z.array(z.string()),
    agentTools: z.array(z.string()),
    hasToken: z.boolean(),
    status: ConnectorStatus.nullable(),
    account: z.string().nullable(),
    scopes: z.array(z.string()),
    checkedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Connector" });
export type ConnectorResponse = z.infer<typeof ConnectorResponse>;

export const ConnectorListResponse = z.object({ items: z.array(ConnectorResponse) }).meta({ id: "ConnectorList" });

export class ConnectorTransformer extends Transformer<ConnectorRow, ConnectorResponse> {
  transform(c: ConnectorRow): ConnectorResponse {
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      provider: c.provider,
      host: c.host,
      command: c.command,
      args: c.args,
      env: c.env,
      transport: c.transport,
      url: c.url,
      headers: c.headers,
      secretKeys: c.secret_keys,
      agentTools: c.agent_tools,
      hasToken: c.has_token,
      status: c.status,
      account: c.account,
      scopes: c.scopes,
      checkedAt: c.checked_at,
      createdAt: c.created_at,
    };
  }
}
