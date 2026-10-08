import "server-only";
import { z } from "zod";
import { ErrorCode, ErrorParams } from "@/ship/contracts/errors";
import { Transformer } from "@/ship/parents/Transformer";
import { ChatUiMessage } from "../../../../Chat/UI/API/Requests/StreamChatRequest";
import { CliRunStatus } from "../../../../CliRunner/Enums/CliRunStatus";
import { CliRunEvent } from "../../../../CliRunner/Events/CliRunEvent";
import type { AgentSessionRow, AgentSessionRunRow } from "../../../Models/AgentSession";

export const AgentSessionSummaryResponse = z
  .object({
    id: z.string(),
    /** null = chưa có lượt nào (FE hiện "Phiên chưa đặt tên"). */
    title: z.string().nullable(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "AgentSessionSummary" });
export type AgentSessionSummaryResponse = z.infer<typeof AgentSessionSummaryResponse>;

export const AgentSessionListResponse = z.object({ items: z.array(AgentSessionSummaryResponse) }).meta({ id: "AgentSessionList" });

export const AgentSessionRunResponse = z
  .object({
    runId: z.string(),
    prompt: z.string(),
    profileId: z.string(),
    status: CliRunStatus,
    exitCode: z.number().int().nullable(),
    error: z.object({ code: ErrorCode, params: ErrorParams.optional() }).nullable(),
    events: z.array(CliRunEvent),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "AgentSessionRun" });
export type AgentSessionRunResponse = z.infer<typeof AgentSessionRunResponse>;

export const AgentSessionResponse = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    title: z.string().nullable(),
    /** Profile CLI đang được nối phiên (null = lượt CLI kế tiếp bắt đầu phiên mới). */
    cliProfileId: z.string().nullable(),
    /** Tin nhắn Direct API (UIMessage), seed lại cho useChat. */
    messages: z.array(ChatUiMessage),
    /** Các lượt CLI đã kết thúc, cũ trước. */
    runs: z.array(AgentSessionRunResponse),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "AgentSession" });
export type AgentSessionResponse = z.infer<typeof AgentSessionResponse>;

export class AgentSessionSummaryTransformer extends Transformer<AgentSessionRow, AgentSessionSummaryResponse> {
  transform(s: AgentSessionRow): AgentSessionSummaryResponse {
    return { id: s.id, title: s.title, updatedAt: s.updated_at };
  }
}

export class AgentSessionTransformer extends Transformer<{ session: AgentSessionRow; runs: AgentSessionRunRow[] }, AgentSessionResponse> {
  transform({ session, runs }: { session: AgentSessionRow; runs: AgentSessionRunRow[] }): AgentSessionResponse {
    return {
      id: session.id,
      workspaceId: session.workspace_id,
      title: session.title,
      cliProfileId: session.cli_session_id ? session.cli_profile_id : null,
      messages: session.messages.items as AgentSessionResponse["messages"],
      runs: runs.map((r) => ({
        runId: r.id,
        prompt: r.prompt,
        profileId: r.profile_id,
        status: r.status,
        exitCode: r.exit_code,
        error: r.error,
        events: r.events.items,
        createdAt: r.created_at,
      })),
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }
}
