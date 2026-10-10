import type { CliLogStream, CliRunEvent } from "@/client/api/generated/model";

/**
 * Dựng một lượt CLI từ event (hàm thuần, kiểu "execution record" của open-design):
 * - `steps`: quá trình làm việc (thinking, tool, lời kể giữa chừng, stdout thô), gập lại khi xong;
 * - `answer`: đoạn text cuối cùng sau bước làm việc cuối, hiện ngoài như câu trả lời / báo cáo;
 * - `proposals`, `usage`, thời gian.
 * Trong lúc chạy không dời gì ra ngoài (tránh nhảy layout); chỉ tách câu trả lời khi run đã kết thúc.
 */

export type ToolKind = "READ" | "EDIT" | "WRITE" | "SEARCH" | "EXEC" | "WEB" | "PLAN" | "TASK" | "OTHER";
export type ToolStatus = "RUNNING" | "DONE" | "ERROR";

export type TurnStep =
  | { kind: "thinking"; key: string; text: string }
  | { kind: "text"; key: string; text: string }
  | { kind: "log"; key: string; text: string; streams: CliLogStream[] }
  | {
      kind: "tool";
      key: string;
      toolId: string | null;
      name: string;
      toolKind: ToolKind;
      target: string | null;
      input: string;
      status: ToolStatus;
      output: string | null;
      durationMs: number | null;
    };

export type TurnUsage = {
  durationMs: number | null;
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  numTurns: number | null;
};

export type CliTurn = {
  steps: TurnStep[];
  answer: string | null;
  proposals: { key: string; file: string; isNewFile: boolean }[];
  usage: TurnUsage | null;
  /** ISO của event đầu / cuối; null khi chưa có event. */
  startedAt: string | null;
  endedAt: string | null;
  toolCount: number;
};

const KIND_BY_NAME: [RegExp, ToolKind][] = [
  [/^(read|view_file|read_file|read_many_files|notebookread|cat)$/i, "READ"],
  [/^(edit|multiedit|replace|edit_file|notebookedit|str_replace.*|apply_patch|file_change)$/i, "EDIT"],
  [/^(write|write_file|create_file|write_to_file)$/i, "WRITE"],
  [/^(grep|glob|ls|list_dir|list_directory|search_file_content|find_by_name|grep_search|codebase_search)$/i, "SEARCH"],
  [/^(bash|command_execution|run_command|run_shell_command|shell|exec)$/i, "EXEC"],
  [/^(webfetch|websearch|web_search|web_fetch|google_web_search|read_url_content)$/i, "WEB"],
  [/^(todowrite|todo_list|update_plan|exitplanmode)$/i, "PLAN"],
  [/^(task|agent)$/i, "TASK"],
];

/** Lệnh shell đọc / tìm thì xếp theo việc thật (cat → READ, grep → SEARCH) như open-design. */
function execKind(command: string | null): ToolKind {
  const first = (command ?? "").replace(/^(bash|zsh|sh)\s+-l?c\s+['"]?/, "").trim().split(/\s+/)[0] ?? "";
  if (/^(cat|head|tail|less|sed)$/.test(first)) return "READ";
  if (/^(grep|rg|find|fd|ls|tree)$/.test(first)) return "SEARCH";
  return "EXEC";
}

export function toolKindOf(name: string, target: string | null): ToolKind {
  const bare = name.includes("__") ? name.split("__").at(-1)! : name;
  const kind = KIND_BY_NAME.find(([re]) => re.test(bare))?.[1] ?? "OTHER";
  return kind === "EXEC" ? execKind(target) : kind;
}

/** Khoá thường chứa đối tượng chính của tool (khớp BE `toolTarget`). */
const TARGET_KEYS = ["file_path", "path", "AbsolutePath", "TargetFile", "notebook_path", "command", "CommandLine", "pattern", "query", "url", "description"];

/** Transcript cũ không có `target`: tách từ chuỗi input JSON (có thể đã bị cắt "…"). */
export function targetFromInput(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (!text.startsWith("{")) return text.split("\n")[0];
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    for (const k of TARGET_KEYS) if (typeof obj[k] === "string" && (obj[k] as string).trim()) return (obj[k] as string).trim().split("\n")[0];
  } catch {
    for (const k of TARGET_KEYS) {
      const m = new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`).exec(text);
      if (m?.[1]) return m[1];
    }
  }
  return null;
}

/** Đường dẫn dài (sandbox /tmp/spec-studio-run-…/specs/a.md) → "…/specs/a.md". */
export function shortTarget(target: string, max = 48): string {
  if (target.length <= max || !target.includes("/") || /\s/.test(target)) return target;
  const parts = target.split("/").filter(Boolean);
  return `…/${parts.slice(-2).join("/")}`;
}

const ms = (from: string, to: string) => {
  const d = Date.parse(to) - Date.parse(from);
  return Number.isFinite(d) && d >= 0 ? d : null;
};

export function buildCliTurn(events: readonly CliRunEvent[], finished: boolean): CliTurn {
  const steps: TurnStep[] = [];
  const proposals: CliTurn["proposals"] = [];
  const toolIndex = new Map<string, number>();
  const toolStartedAt = new Map<number, string>();
  let usage: TurnUsage | null = null;

  for (const e of events) {
    const last = steps.at(-1);
    switch (e.type) {
      case "THINKING":
        if (e.delta && last?.kind === "thinking") steps[steps.length - 1] = { ...last, text: last.text + e.text };
        else steps.push({ kind: "thinking", key: `think-${e.seq}`, text: e.text });
        break;
      case "MESSAGE":
        if (e.delta && last?.kind === "text") steps[steps.length - 1] = { ...last, text: last.text + e.text };
        else steps.push({ kind: "text", key: `text-${e.seq}`, text: e.text });
        break;
      case "LOG":
        if (last?.kind === "log") {
          steps[steps.length - 1] = { ...last, text: `${last.text}\n${e.text}`, streams: last.streams.includes(e.stream) ? last.streams : [...last.streams, e.stream] };
        } else steps.push({ kind: "log", key: `log-${e.seq}`, text: e.text, streams: [e.stream] });
        break;
      case "TOOL_CALL": {
        const toolId = e.toolId ?? null;
        const target = e.target ?? targetFromInput(e.input);
        if (toolId && toolIndex.has(toolId)) break; // CLI gửi lại cùng tool call
        steps.push({
          kind: "tool",
          key: `tool-${e.seq}`,
          toolId,
          name: e.name,
          toolKind: toolKindOf(e.name, target),
          target,
          input: e.input,
          // Transcript cũ / CLI không có id: không biết khi nào xong → coi là xong khi run kết thúc.
          status: toolId || !finished ? "RUNNING" : "DONE",
          output: null,
          durationMs: null,
        });
        if (toolId) toolIndex.set(toolId, steps.length - 1);
        toolStartedAt.set(steps.length - 1, e.at);
        break;
      }
      case "TOOL_RESULT": {
        const i = toolIndex.get(e.toolId);
        const step = i === undefined ? undefined : steps[i];
        if (i === undefined || step?.kind !== "tool") break;
        const started = toolStartedAt.get(i);
        steps[i] = { ...step, status: e.isError ? "ERROR" : "DONE", output: e.output || null, durationMs: started ? ms(started, e.at) : null };
        break;
      }
      case "USAGE":
        usage = { durationMs: e.durationMs, costUsd: e.costUsd, inputTokens: e.inputTokens, outputTokens: e.outputTokens, numTurns: e.numTurns };
        break;
      case "PROPOSAL":
        proposals.push({ key: `prop-${e.seq}`, file: e.file, isNewFile: e.isNewFile });
        break;
      default:
        break;
    }
  }

  // Run đã kết thúc: tool chưa có kết quả thì không còn chạy nữa.
  const settled = finished ? steps.map((s) => (s.kind === "tool" && s.status === "RUNNING" ? { ...s, status: "DONE" as const } : s)) : steps;

  // Câu trả lời = các đoạn text liền nhau ở cuối (sau bước làm việc cuối cùng).
  let answer: string | null = null;
  let process = settled;
  if (finished) {
    let cut = settled.length;
    while (cut > 0 && settled[cut - 1].kind === "text") cut--;
    const tail = settled.slice(cut) as Extract<TurnStep, { kind: "text" }>[];
    const text = tail.map((s) => s.text.trim()).filter(Boolean).join("\n\n");
    if (text) {
      answer = text;
      process = settled.slice(0, cut);
    }
  }

  return {
    steps: process,
    answer,
    proposals,
    usage,
    startedAt: events[0]?.at ?? null,
    endedAt: events.at(-1)?.at ?? null,
    toolCount: process.filter((s) => s.kind === "tool").length,
  };
}
