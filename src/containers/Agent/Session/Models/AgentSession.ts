import { z } from "zod";
import { ErrorCode, ErrorParams } from "@/ship/contracts/errors";
import { CliRunStatus } from "../../CliRunner/Enums/CliRunStatus";
import { CliRunEvent } from "../../CliRunner/Events/CliRunEvent";

/**
 * Một phiên chat với Agent trong Workspace: tin nhắn Direct API (UIMessage của AI SDK) + các lượt chạy CLI.
 * Mảng lưu trong object `{ items }` vì driver Postgres không map mảng object thẳng vào cột jsonb.
 */
export const AgentSessionRow = z.object({
  id: z.string(),
  workspace_id: z.string(),
  /** Đầu prompt đầu tiên; null khi chưa có lượt nào. */
  title: z.string().nullable(),
  /** Profile CLI của `cli_session_id`; đổi profile thì không resume id cũ. */
  cli_profile_id: z.string().nullable(),
  cli_session_id: z.string().nullable(),
  messages: z.object({ items: z.array(z.record(z.string(), z.unknown())) }),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentSessionRow = z.infer<typeof AgentSessionRow>;

/** Một lượt chạy CLI đã kết thúc trong session (run sống chỉ nằm trong bộ nhớ, xem CliRunStore). */
export const AgentSessionRunRow = z.object({
  /** = runId. */
  id: z.string(),
  session_id: z.string(),
  prompt: z.string(),
  profile_id: z.string(),
  status: CliRunStatus,
  exit_code: z.number().int().nullable(),
  error: z.object({ code: ErrorCode, params: ErrorParams.optional() }).nullable(),
  events: z.object({ items: z.array(CliRunEvent) }),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentSessionRunRow = z.infer<typeof AgentSessionRunRow>;

/** Độ dài tối đa của tiêu đề session (lấy từ prompt đầu). */
/** Tiêu đề phiên = vài chữ đầu của câu hỏi đầu tiên. */
export const SESSION_TITLE_WORDS = 6;
export const SESSION_TITLE_MAX = 48;

export const sessionTitleOf = (prompt: string): string | null => {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  let title = words.slice(0, SESSION_TITLE_WORDS).join(" ");
  if (title.length > SESSION_TITLE_MAX) title = title.slice(0, SESSION_TITLE_MAX).trimEnd();
  if (title.length === words.join(" ").length) return title;
  return `${title.replace(/[\s.,;:!?…-]+$/u, "")}…`;
};

declare module "@/ship/contracts/data" {
  interface DataModels {
    agent_sessions: AgentSessionRow;
    agent_session_runs: AgentSessionRunRow;
  }
}
