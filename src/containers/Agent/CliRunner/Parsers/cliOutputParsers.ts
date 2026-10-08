import "server-only";
import type { CliOutputFormat } from "@/ship/contracts/enums/agent";
import type { CliRunEventDraft } from "../Events/CliRunEvent";

/**
 * Đọc từng dòng stdout của CLI agent theo `outputFormat` của profile và đổi thành event của run.
 * Hàm thuần, không I/O. Dòng không hiểu được ở định dạng JSON → LOG (không làm mất thông tin).
 */

const MAX_INPUT_SUMMARY = 300;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function summarizeInput(input: unknown): string {
  const text = typeof input === "string" ? input : (JSON.stringify(input) ?? "");
  return text.length > MAX_INPUT_SUMMARY ? `${text.slice(0, MAX_INPUT_SUMMARY)}…` : text;
}

const log = (text: string, stream: "STDOUT" | "STDERR" = "STDOUT"): CliRunEventDraft => ({ type: "LOG", stream, text });
const message = (text: string, delta = false): CliRunEventDraft => ({ type: "MESSAGE", text, delta });
const toolCall = (name: string, input: unknown): CliRunEventDraft => ({ type: "TOOL_CALL", name, input: summarizeInput(input) });

/**
 * `--output-format stream-json`:
 * - Claude Code: {type:"assistant", message:{content:[{type:"text"}|{type:"tool_use"}]}}, {type:"result", is_error}...
 * - Antigravity / Gemini CLI: {type:"message", role:"assistant", content, delta}, {type:"tool_use", tool_name, parameters}, {type:"error"}...
 */
function parseStreamJson(obj: Json): CliRunEventDraft[] {
  switch (obj.type) {
    case "assistant": {
      const content = isObject(obj.message) && Array.isArray(obj.message.content) ? obj.message.content : [];
      return content.flatMap((block): CliRunEventDraft[] => {
        if (!isObject(block)) return [];
        if (block.type === "text" && str(block.text)) return [message(block.text as string)];
        if (block.type === "tool_use") return [toolCall(str(block.name) ?? "tool", block.input)];
        return [];
      });
    }
    case "message":
      return obj.role === "assistant" && str(obj.content) ? [message(obj.content as string, obj.delta === true)] : [];
    case "tool_use":
      return [toolCall(str(obj.tool_name) ?? str(obj.name) ?? "tool", obj.parameters ?? obj.input)];
    case "result":
      if (obj.is_error === true || (str(obj.subtype) ?? "").startsWith("error") || obj.status === "error") {
        return [log(str(obj.result) ?? str(obj.subtype) ?? "error", "STDERR")];
      }
      return [];
    case "error":
      return [log(str(obj.message) ?? summarizeInput(obj.error ?? obj), "STDERR")];
    default:
      return [];
  }
}

/** `codex exec --json`: {type:"item.started"|"item.completed", item:{type:"agent_message"|"command_execution"|...}}, turn.failed, error. */
function parseJsonl(obj: Json): CliRunEventDraft[] {
  const item = isObject(obj.item) ? obj.item : undefined;
  if (item && (obj.type === "item.started" || obj.type === "item.completed")) {
    const started = obj.type === "item.started";
    switch (item.type) {
      case "agent_message":
        return !started && str(item.text) ? [message(item.text as string)] : [];
      case "command_execution":
        return started ? [toolCall("command_execution", item.command)] : [];
      case "file_change": {
        const changes = Array.isArray(item.changes) ? item.changes : [];
        return started ? [] : [toolCall("file_change", changes.map((c) => (isObject(c) ? `${str(c.kind) ?? ""} ${str(c.path) ?? ""}`.trim() : "")).join(", "))];
      }
      case "mcp_tool_call":
        return started ? [toolCall([str(item.server), str(item.tool)].filter(Boolean).join(".") || "mcp_tool_call", item.arguments)] : [];
      case "web_search":
        return started ? [toolCall("web_search", item.query)] : [];
      case "error":
        return [log(str(item.message) ?? "error", "STDERR")];
      default:
        return [];
    }
  }
  if (obj.type === "turn.failed") return [log((isObject(obj.error) && str(obj.error.message)) || "turn failed", "STDERR")];
  if (obj.type === "error") return [log(str(obj.message) ?? "error", "STDERR")];
  return [];
}

export function parseCliLine(format: CliOutputFormat, line: string): CliRunEventDraft[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  if (format === "TEXT") return [log(line)];

  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return [log(line)];
  }
  if (!isObject(obj)) return [log(line)];
  return format === "STREAM_JSON" ? parseStreamJson(obj) : parseJsonl(obj);
}
