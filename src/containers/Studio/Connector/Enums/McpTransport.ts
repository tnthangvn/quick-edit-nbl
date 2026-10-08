import { z } from "zod";

/** Cách nối tới MCP server: STDIO (command + args + env) hoặc HTTP (Streamable HTTP: url + header). */
export const McpTransport = z.enum(["STDIO", "HTTP"]).meta({ id: "McpTransport" });
export type McpTransport = z.infer<typeof McpTransport>;
