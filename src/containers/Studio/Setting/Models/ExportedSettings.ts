import { z } from "zod";
import { AgentSettings, CliProfile } from "@/ship/contracts/agentSettings";
import { ConnectorType, GitProvider } from "@/ship/contracts/enums/sync";
import { McpTransport } from "../../Connector/Enums/McpTransport";

/**
 * Connector xuất ra file export: chỉ cấu hình cơ bản (provider, host, command, tên khoá secret cần nhập lại) —
 * KHÔNG có token/giá trị secret, và không có field runtime (id, status, account, scopes, checked_at).
 */
export const ExportedConnector = z
  .object({
    name: z.string().min(1),
    type: ConnectorType,
    provider: GitProvider,
    host: z.string().nullable(),
    command: z.string().nullable(),
    args: z.array(z.string()),
    env: z.record(z.string(), z.string()),
    transport: McpTransport.nullable(),
    url: z.string().nullable(),
    headers: z.record(z.string(), z.string()),
    /** Tên khoá secret cần người dùng nhập lại sau khi import (không phải giá trị). */
    secret_keys: z.array(z.string()),
    agent_tools: z.array(z.string()),
  })
  .meta({ id: "ExportedConnector" });
export type ExportedConnector = z.infer<typeof ExportedConnector>;

/**
 * File export/import Settings (Settings › Export/Import): cấu hình cơ bản Direct API + CLI Agent Runner + Connectors,
 * KHÔNG kèm secret/account (apiKeyRef, token, giá trị env/header bí mật) — người dùng tự đăng nhập/nhập lại ở máy mới.
 */
export const ExportedSettings = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    agent: z.object({
      activeMode: AgentSettings.shape.activeMode,
      api: AgentSettings.shape.api.omit({ apiKeyRef: true }),
      cli: AgentSettings.shape.cli.extend({ profiles: z.array(CliProfile) }),
    }),
    connectors: z.array(ExportedConnector),
  })
  .meta({ id: "ExportedSettings" });
export type ExportedSettings = z.infer<typeof ExportedSettings>;
