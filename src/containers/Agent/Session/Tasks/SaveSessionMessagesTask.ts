import "server-only";
import { Task } from "@/ship/parents/Task";
import { AgentSessionRepository } from "../Data/Repositories/AgentSessionRepository";
import { sessionTitleOf } from "../Models/AgentSession";

type UiMessageLike = { role?: unknown; parts?: unknown };

/** Text của tin nhắn người dùng đầu tiên (làm tiêu đề session). */
function firstUserText(messages: readonly UiMessageLike[]): string {
  const first = messages.find((m) => m.role === "user");
  const parts = Array.isArray(first?.parts) ? first.parts : [];
  return parts
    .map((p) => (typeof p === "object" && p !== null && (p as { type?: unknown }).type === "text" ? String((p as { text?: unknown }).text ?? "") : ""))
    .join(" ");
}

/** Ghi đè toàn bộ tin nhắn Direct API của session (AI SDK trả lại cả lịch sử sau mỗi lượt); gán tiêu đề nếu chưa có. */
export class SaveSessionMessagesTask extends Task<{ sessionId: string; messages: Record<string, unknown>[] }> {
  constructor(private readonly repo = new AgentSessionRepository()) {
    super();
  }

  async run({ sessionId, messages }: { sessionId: string; messages: Record<string, unknown>[] }): Promise<void> {
    const session = await this.repo.findByIdOrNull(sessionId);
    if (!session) return;
    await this.repo.patch(sessionId, {
      messages: { items: messages },
      ...(session.title ? {} : { title: sessionTitleOf(firstUserText(messages)) }),
    });
  }
}
