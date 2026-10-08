import "server-only";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** Khai báo một MCP server (spec 3.0.2). Giá trị secret đã được resolve trước khi vào đây. */
export type McpServerSpec =
  | { transport: "STDIO"; command: string; args: string[]; env: Record<string, string>; cwd?: string }
  | { transport: "HTTP"; url: string; headers: Record<string, string> };

export type McpToolInfo = { name: string; description: string | null };

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Mở kết nối tới MCP server, chạy `fn`, luôn đóng kết nối (stdio: tắt tiến trình con).
 * stdio chạy KHÔNG qua shell (command + args mảng); stderr của server bị bỏ qua để không lộ secret vào log.
 */
export async function withMcpClient<T>(spec: McpServerSpec, fn: (client: Client) => Promise<T>): Promise<T> {
  const transport =
    spec.transport === "STDIO"
      ? new StdioClientTransport({
          command: spec.command,
          args: spec.args,
          env: { ...getDefaultEnvironment(), ...spec.env },
          cwd: spec.cwd,
          stderr: "ignore",
        })
      : new StreamableHTTPClientTransport(new URL(spec.url), { requestInit: { headers: spec.headers } });
  const client = new Client({ name: "spec-studio", version: "1.0.0" });
  try {
    await client.connect(transport, { timeout: REQUEST_TIMEOUT_MS });
    return await fn(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function listMcpTools(spec: McpServerSpec): Promise<McpToolInfo[]> {
  return withMcpClient(spec, async (client) => {
    const out: McpToolInfo[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : undefined, { timeout: REQUEST_TIMEOUT_MS });
      out.push(...page.tools.map((t) => ({ name: t.name, description: t.description ?? null })));
      cursor = page.nextCursor;
    } while (cursor);
    return out;
  });
}

/** Lỗi do tool MCP trả về (isError) — không mang nội dung để tránh lộ dữ liệu vào response. */
export class McpToolError extends Error {
  constructor(readonly tool: string) {
    super(`mcp tool ${tool} failed`);
    this.name = "McpToolError";
  }
}

/**
 * Gọi một tool, trả kết quả có cấu trúc: `structuredContent` nếu server có, không thì parse JSON từ text đầu tiên
 * (đa số Git MCP server trả JSON dạng text). Không parse được thì trả chuỗi text.
 */
export async function callMcpTool(client: Client, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: REQUEST_TIMEOUT_MS });
  if (result.isError) throw new McpToolError(name);
  if (result.structuredContent) return result.structuredContent;
  const content = Array.isArray(result.content) ? result.content : [];
  const text = content.find((c): c is { type: "text"; text: string } => c?.type === "text")?.text;
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
