import { z } from "zod";
import { ErrorCode, ErrorParams } from "@/ship/contracts/errors";
import { CliLogStream } from "../Enums/CliLogStream";
import { CliRunStatus } from "../Enums/CliRunStatus";

/**
 * Sự kiện của một lần chạy CLI agent, đẩy ra SSE GET /api/agent/runs/{runId}/events.
 * `seq` tăng dần trong một run: client nối lại (EventSource reconnect) sẽ nhận lại toàn bộ, bỏ qua seq đã có.
 */
const base = {
  runId: z.string(),
  seq: z.number().int().nonnegative(),
  at: z.iso.datetime(),
};

export const CliRunStatusEvent = z
  .object({
    type: z.literal("STATUS"),
    ...base,
    status: CliRunStatus,
    /** Mã thoát của tiến trình khi đã kết thúc, null nếu chưa / không có. */
    exitCode: z.number().int().nullable(),
    error: z.object({ code: ErrorCode, params: ErrorParams.optional() }).nullable(),
  })
  .meta({ id: "CliRunStatusEvent" });

export const CliRunLogEvent = z
  .object({ type: z.literal("LOG"), ...base, stream: CliLogStream, text: z.string() })
  .meta({ id: "CliRunLogEvent" });

export const CliRunToolCallEvent = z
  .object({
    type: z.literal("TOOL_CALL"),
    ...base,
    name: z.string(),
    /** Tóm tắt input của tool (đã cắt ngắn). */
    input: z.string(),
  })
  .meta({ id: "CliRunToolCallEvent" });

export const CliRunMessageEvent = z
  .object({
    type: z.literal("MESSAGE"),
    ...base,
    text: z.string(),
    /** true: đoạn nối tiếp vào MESSAGE trước (CLI stream từng phần). */
    delta: z.boolean(),
  })
  .meta({ id: "CliRunMessageEvent" });

export const CliRunProposalEvent = z
  .object({
    type: z.literal("PROPOSAL"),
    ...base,
    /** Đường dẫn tương đối trong specsDir; nội dung diff đi qua SPEC_PROPOSED (sourceId = runId) trên SSE của workspace. */
    file: z.string(),
    isNewFile: z.boolean(),
  })
  .meta({ id: "CliRunProposalEvent" });

export const CliRunSessionEvent = z
  .object({
    type: z.literal("SESSION"),
    ...base,
    /** Id phiên của chính CLI (claude session_id, agy conversation_id, codex thread_id) để lượt sau resume. */
    cliSessionId: z.string(),
  })
  .meta({ id: "CliRunSessionEvent" });

export const CliRunEvent = z
  .discriminatedUnion("type", [CliRunStatusEvent, CliRunLogEvent, CliRunToolCallEvent, CliRunMessageEvent, CliRunProposalEvent, CliRunSessionEvent])
  .meta({ id: "CliRunEvent" });
export type CliRunEvent = z.infer<typeof CliRunEvent>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** Event chưa gắn runId / seq / at (parser và runner tạo ra, store gắn phần còn lại). */
export type CliRunEventDraft = DistributiveOmit<CliRunEvent, keyof typeof base>;
