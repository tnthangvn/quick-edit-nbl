import "server-only";
import type { CliOutputFormat } from "@/ship/contracts/enums/agent";
import type { CliRunEventDraft } from "../Events/CliRunEvent";

/**
 * Đọc từng dòng stdout của CLI agent theo `outputFormat` của profile và đổi thành event của run.
 * Không I/O. Parser có trạng thái theo từng run (`createCliOutputParser`): Claude stream text/thinking từng phần
 * rồi gửi lại cả khối trong message "assistant", parser nhớ đã stream để không lặp. Dòng JSON không hiểu → LOG.
 */

const MAX_INPUT_SUMMARY = 300;
const MAX_TARGET = 200;
const MAX_TOOL_OUTPUT = 4000;

type Json = Record<string, unknown>;
export type CliLineParser = (line: string) => CliRunEventDraft[];

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

export function summarizeInput(input: unknown): string {
  return clip(typeof input === "string" ? input : (JSON.stringify(input) ?? ""), MAX_INPUT_SUMMARY);
}

/** Khoá thường gặp chứa đối tượng chính của tool (Claude, Gemini, agy, MCP). */
const TARGET_KEYS = ["file_path", "path", "AbsolutePath", "TargetFile", "notebook_path", "command", "CommandLine", "pattern", "query", "url", "description"];

/** Đối tượng chính để hiện một dòng: file / lệnh / pattern / url. */
export function toolTarget(input: unknown): string | null {
  if (typeof input === "string") return input.trim() ? clip(input.trim().split("\n")[0], MAX_TARGET) : null;
  if (!isObject(input)) return null;
  for (const key of TARGET_KEYS) {
    const v = str(input[key]);
    if (v?.trim()) return clip(v.trim().split("\n")[0], MAX_TARGET);
  }
  return null;
}

/** tool_result.content của Claude: chuỗi hoặc mảng block {type:"text", text}. */
function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (isObject(b) && str(b.text)) || (isObject(b) && b.type === "image" ? "[image]" : ""))
      .filter(Boolean)
      .join("\n");
  }
  return content === undefined || content === null ? "" : (JSON.stringify(content) ?? "");
}

const log = (text: string, stream: "STDOUT" | "STDERR" = "STDOUT"): CliRunEventDraft => ({ type: "LOG", stream, text });
const message = (text: string, delta = false): CliRunEventDraft => ({ type: "MESSAGE", text, delta });
const thinking = (text: string, delta = false): CliRunEventDraft => ({ type: "THINKING", text, delta });
const toolCall = (name: string, input: unknown, toolId: unknown = null): CliRunEventDraft => ({
  type: "TOOL_CALL",
  toolId: str(toolId) ?? null,
  name,
  input: summarizeInput(input),
  target: toolTarget(input),
});
const toolResult = (toolId: string, output: string, isError: boolean): CliRunEventDraft => ({
  type: "TOOL_RESULT",
  toolId,
  output: clip(output, MAX_TOOL_OUTPUT),
  isError,
});
const session = (id: unknown): CliRunEventDraft[] => (str(id) ? [{ type: "SESSION", cliSessionId: id as string }] : []);

/**
 * Antigravity (`agy -p --output-format stream-json`): {event:"init", conversation_id},
 * {event:"step_update", step_update:{step_type:"agent_response", text_delta} | {step_type:"tool", state, tool_info:{name, parameters}}},
 * {event:"result", result:{status, response}}.
 */
function antigravityParser(): (obj: Json) => CliRunEventDraft[] {
  let lastToolId: string | null = null;
  let toolSeq = 0;
  return (obj) => {
    switch (obj.event) {
      case "init":
        return session(obj.conversation_id);
      case "step_update": {
        const step = isObject(obj.step_update) ? obj.step_update : {};
        if (step.step_type === "agent_response" && str(step.text_delta)) return [message(step.text_delta as string, true)];
        if (step.step_type === "agent_response" && str(step.thinking_delta)) return [thinking(step.thinking_delta as string, true)];
        if (step.step_type !== "tool") return [];
        const info = isObject(step.tool_info) ? step.tool_info : {};
        if (step.state === "ACTIVE") {
          lastToolId = str(step.step_id) ?? str(step.id) ?? `agy-tool-${++toolSeq}`;
          return [toolCall(str(info.name) ?? str(step.tool_name) ?? "tool", info.parameters, lastToolId)];
        }
        if ((step.state === "DONE" || step.state === "ERROR" || step.state === "FAILED") && lastToolId) {
          const id = str(step.step_id) ?? str(step.id) ?? lastToolId;
          lastToolId = null;
          return [toolResult(id, resultText(info.result ?? step.output ?? ""), step.state !== "DONE")];
        }
        return [];
      }
      case "result": {
        const result = isObject(obj.result) ? obj.result : {};
        return result.status === "SUCCESS" ? [] : [log(str(result.response) || str(result.status) || "error", "STDERR")];
      }
      case "error":
        return [log(str(obj.message) ?? summarizeInput(obj.error ?? obj), "STDERR")];
      default:
        return [];
    }
  };
}

/**
 * `--output-format stream-json`:
 * - Claude Code: {type:"system", subtype:"init", session_id}; với `--include-partial-messages` thêm
 *   {type:"stream_event", event:{type:"content_block_start"|"content_block_delta"}} (text_delta / thinking_delta);
 *   {type:"assistant", message:{content:[text|thinking|tool_use]}}, {type:"user", message:{content:[tool_result]}},
 *   {type:"result", is_error, duration_ms, total_cost_usd, num_turns, usage}.
 * - Gemini CLI: {type:"message", role:"assistant", content, delta}, {type:"tool_use", tool_name, parameters, tool_id},
 *   {type:"tool_result", tool_id, status, output}, {type:"error"}...
 * - Antigravity: khoá `event` thay cho `type` (xem antigravityParser).
 */
function streamJsonParser(): (obj: Json) => CliRunEventDraft[] {
  const agy = antigravityParser();
  // Claude: khối text/thinking đã stream qua stream_event thì bỏ bản đầy đủ trong "assistant".
  let streamedText = false;
  let streamedThinking = false;
  // Delta đầu tiên của một khối mở đoạn mới (delta=false), các delta sau nối tiếp.
  let blockOpen: "text" | "thinking" | null = null;

  const streamEvent = (ev: Json): CliRunEventDraft[] => {
    if (ev.type === "content_block_start") {
      blockOpen = null;
      return [];
    }
    if (ev.type !== "content_block_delta" || !isObject(ev.delta)) return [];
    const d = ev.delta;
    if (d.type === "text_delta" && str(d.text)) {
      streamedText = true;
      const first = blockOpen !== "text";
      blockOpen = "text";
      return [message(d.text as string, !first)];
    }
    if (d.type === "thinking_delta" && str(d.thinking)) {
      streamedThinking = true;
      const first = blockOpen !== "thinking";
      blockOpen = "thinking";
      return [thinking(d.thinking as string, !first)];
    }
    return [];
  };

  const assistant = (msg: unknown): CliRunEventDraft[] => {
    const content = isObject(msg) && Array.isArray(msg.content) ? msg.content : [];
    const out = content.flatMap((block): CliRunEventDraft[] => {
      if (!isObject(block)) return [];
      if (block.type === "text" && str(block.text) && !streamedText) return [message(block.text as string)];
      if (block.type === "thinking" && str(block.thinking) && !streamedThinking) return [thinking(block.thinking as string)];
      if (block.type === "tool_use") return [toolCall(str(block.name) ?? "tool", block.input, block.id)];
      return [];
    });
    streamedText = false;
    streamedThinking = false;
    blockOpen = null;
    return out;
  };

  const user = (msg: unknown): CliRunEventDraft[] => {
    const content = isObject(msg) && Array.isArray(msg.content) ? msg.content : [];
    return content.flatMap((block): CliRunEventDraft[] =>
      isObject(block) && block.type === "tool_result" && str(block.tool_use_id)
        ? [toolResult(block.tool_use_id as string, resultText(block.content), block.is_error === true)]
        : [],
    );
  };

  const usage = (obj: Json): CliRunEventDraft => {
    const u = isObject(obj.usage) ? obj.usage : {};
    const input = [u.input_tokens, u.cache_read_input_tokens, u.cache_creation_input_tokens].map(int).filter((n): n is number => n !== null);
    return {
      type: "USAGE",
      durationMs: num(obj.duration_ms),
      costUsd: num(obj.total_cost_usd),
      inputTokens: input.length ? input.reduce((a, b) => a + b, 0) : null,
      outputTokens: int(u.output_tokens),
      numTurns: int(obj.num_turns),
    };
  };

  return (obj) => {
    if (obj.type === undefined && typeof obj.event === "string") return agy(obj);
    switch (obj.type) {
      case "system":
        return obj.subtype === "init" ? session(obj.session_id) : [];
      case "stream_event":
        return isObject(obj.event) ? streamEvent(obj.event) : [];
      case "assistant":
        return assistant(obj.message);
      case "user":
        return user(obj.message);
      case "message":
        return obj.role === "assistant" && str(obj.content) ? [message(obj.content as string, obj.delta === true)] : [];
      case "tool_use":
        return [toolCall(str(obj.tool_name) ?? str(obj.name) ?? "tool", obj.parameters ?? obj.input, obj.tool_id ?? obj.id)];
      case "tool_result":
        return str(obj.tool_id) ? [toolResult(obj.tool_id as string, resultText(obj.output ?? obj.content), obj.status === "error")] : [];
      case "result": {
        const failed = obj.is_error === true || (str(obj.subtype) ?? "").startsWith("error") || obj.status === "error";
        const stats = obj.duration_ms !== undefined || obj.usage !== undefined || obj.total_cost_usd !== undefined ? [usage(obj)] : [];
        return failed ? [...stats, log(str(obj.result) ?? str(obj.subtype) ?? "error", "STDERR")] : stats;
      }
      case "error":
        return [log(str(obj.message) ?? summarizeInput(obj.error ?? obj), "STDERR")];
      default:
        return [];
    }
  };
}

/**
 * `codex exec --json`: {type:"thread.started", thread_id}, {type:"item.started"|"item.completed", item:{id, type:...}},
 * {type:"turn.completed", usage}, turn.failed, error.
 */
function jsonlParser(): (obj: Json) => CliRunEventDraft[] {
  const startedAt = Date.now();
  return (obj) => {
    if (obj.type === "thread.started") return session(obj.thread_id);
    if (obj.type === "turn.completed") {
      const u = isObject(obj.usage) ? obj.usage : {};
      const input = [u.input_tokens, u.cached_input_tokens].map(int).filter((n): n is number => n !== null);
      return [
        {
          type: "USAGE",
          durationMs: Date.now() - startedAt,
          costUsd: null,
          inputTokens: input.length ? input.reduce((a, b) => a + b, 0) : null,
          outputTokens: int(u.output_tokens),
          numTurns: null,
        },
      ];
    }
    const item = isObject(obj.item) ? obj.item : undefined;
    if (item && (obj.type === "item.started" || obj.type === "item.completed")) {
      const started = obj.type === "item.started";
      const id = str(item.id) ?? null;
      switch (item.type) {
        case "agent_message":
          return !started && str(item.text) ? [message(item.text as string)] : [];
        case "reasoning":
          return !started && str(item.text) ? [thinking(item.text as string)] : [];
        case "command_execution": {
          if (started) return [toolCall("command_execution", item.command, id)];
          if (!id) return [];
          const exit = typeof item.exit_code === "number" ? item.exit_code : null;
          return [toolResult(id, str(item.aggregated_output) ?? "", (exit !== null && exit !== 0) || item.status === "failed")];
        }
        case "file_change": {
          if (started) return [];
          const changes = Array.isArray(item.changes) ? item.changes : [];
          const summary = changes.map((c) => (isObject(c) ? `${str(c.kind) ?? ""} ${str(c.path) ?? ""}`.trim() : "")).join(", ");
          const call = toolCall("file_change", summary, id);
          return id ? [call, toolResult(id, summary, item.status === "failed")] : [call];
        }
        case "mcp_tool_call": {
          const name = [str(item.server), str(item.tool)].filter(Boolean).join(".") || "mcp_tool_call";
          if (started) return [toolCall(name, item.arguments, id)];
          return id ? [toolResult(id, resultText(item.result ?? item.error ?? ""), item.status === "failed")] : [];
        }
        case "web_search":
          return started ? [toolCall("web_search", item.query, id)] : id ? [toolResult(id, "", false)] : [];
        case "todo_list": {
          const items = Array.isArray(item.items) ? item.items : [];
          const text = items.map((t) => (isObject(t) ? `${t.completed === true ? "[x]" : "[ ]"} ${str(t.text) ?? ""}` : "")).join("\n");
          return started || !text ? [] : [toolCall("todo_list", text, id), ...(id ? [toolResult(id, text, false)] : [])];
        }
        case "error":
          return [log(str(item.message) ?? "error", "STDERR")];
        default:
          return [];
      }
    }
    if (obj.type === "turn.failed") return [log((isObject(obj.error) && str(obj.error.message)) || "turn failed", "STDERR")];
    if (obj.type === "error") return [log(str(obj.message) ?? "error", "STDERR")];
    return [];
  };
}

/** Parser cho một run (giữ trạng thái giữa các dòng). */
export function createCliOutputParser(format: CliOutputFormat): CliLineParser {
  const parseObject = format === "STREAM_JSON" ? streamJsonParser() : format === "JSONL" ? jsonlParser() : null;
  return (line) => {
    const trimmed = line.trim();
    if (!trimmed) return [];
    if (!parseObject) return [log(line)];
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return [log(line)];
    }
    return isObject(obj) ? parseObject(obj) : [log(line)];
  };
}

/** Parse một dòng độc lập (không có trạng thái giữa các dòng). */
export function parseCliLine(format: CliOutputFormat, line: string): CliRunEventDraft[] {
  return createCliOutputParser(format)(line);
}

/**
 * CLI kết thúc exit 0 nhưng không làm được gì vì tool bị tự từ chối ở chế độ headless
 * (Antigravity: "no output produced — a tool required the "command" permission that headless mode cannot prompt for…").
 */
export const isPermissionDeniedLine = (line: string): boolean => /no output produced.*(headless mode cannot prompt|auto-denied)/i.test(line);
