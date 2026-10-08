import { z } from "zod";
import { GitProvider } from "@/ship/contracts/enums/sync";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { GitHost } from "../../../../Setting/Models/ConfigFields";
import { McpTransport } from "../../../Enums/McpTransport";
import { ConnectorResponse } from "../Transformers/ConnectorTransformer";
import { AgentToolsField, ArgsField, CommandField, ConnectorIdParams, EnvField, HeadersField, HttpUrlField, SecretKeyField } from "./connectorFields";

/** Sửa connector (không đổi được loại). secrets / token: chuỗi = ghi đè, null = xoá, bỏ trống = giữ nguyên. */
export const UpdateConnectorBody = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    provider: GitProvider.optional(),
    host: GitHost.nullable().optional(),
    command: CommandField.optional(),
    args: ArgsField.optional(),
    env: EnvField.optional(),
    transport: McpTransport.optional(),
    url: HttpUrlField.optional(),
    headers: HeadersField.optional(),
    secrets: z.record(SecretKeyField, z.string().min(1).max(8192).nullable()).optional(),
    token: z.string().trim().min(1).max(8192).nullable().optional(),
    agentTools: AgentToolsField.optional().meta({ description: "Tool MCP cấp cho AI Agent (bật/tắt ở Tab 5)" }),
  })
  .meta({ id: "UpdateConnectorInput" });

export const updateConnectorContract = defineContract({
  request: { params: ConnectorIdParams, body: UpdateConnectorBody },
  responses: { 200: ConnectorResponse, 404: ErrorResponse },
});
