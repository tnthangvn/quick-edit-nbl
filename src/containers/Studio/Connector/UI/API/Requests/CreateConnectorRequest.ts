import { z } from "zod";
import { ConnectorType, GitProvider } from "@/ship/contracts/enums/sync";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { GitHost } from "../../../../Setting/Models/ConfigFields";
import { McpTransport } from "../../../Enums/McpTransport";
import { KNOWN_CLIS } from "../../../Gateways/cliTools";
import { ConnectorResponse } from "../Transformers/ConnectorTransformer";
import { AgentToolsField, ArgsField, CommandField, EnvField, HeadersField, HttpUrlField, SecretKeyField } from "./connectorFields";

export const CreateConnectorBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: ConnectorType,
    provider: GitProvider,
    host: GitHost.nullable().default(null),
    command: CommandField.nullable().default(null).meta({ description: "CLI: gh / glab / tea (bỏ trống = theo provider); MCP stdio: lệnh chạy server" }),
    args: ArgsField.default([]),
    env: EnvField.default({}),
    transport: McpTransport.nullable().default(null),
    url: HttpUrlField.nullable().default(null),
    headers: HeadersField.default({}),
    secrets: z
      .record(SecretKeyField, z.string().min(1).max(8192))
      .default({})
      .meta({ description: "Chỉ ghi: env (stdio) / header (HTTP) bí mật của MCP server, lưu trong secret store" }),
    token: z.string().trim().min(1).max(8192).optional().meta({ description: "Chỉ ghi: Personal Access Token cho connector TOKEN" }),
    agentTools: AgentToolsField.default([]),
  })
  .superRefine((v, ctx) => {
    const required = (path: string) => ctx.addIssue({ code: "custom", path: [path], message: "FIELD.REQUIRED" });
    if (v.type === "CLI" && !v.command && !KNOWN_CLIS.some((c) => c.provider === v.provider)) required("command");
    if (v.type === "MCP") {
      if (!v.transport) required("transport");
      if (v.transport === "STDIO" && !v.command) required("command");
      if (v.transport === "HTTP" && !v.url) required("url");
    }
    if (v.type === "TOKEN") {
      if (!v.token) required("token");
      if (v.provider === "GENERIC") ctx.addIssue({ code: "custom", path: ["provider"], message: "FIELD.INVALID_VALUE" });
    }
  })
  .meta({ id: "CreateConnectorInput" });

export const createConnectorContract = defineContract({
  request: { body: CreateConnectorBody },
  responses: { 201: ConnectorResponse, 400: ErrorResponse },
});
