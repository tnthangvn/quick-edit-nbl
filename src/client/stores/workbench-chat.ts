"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { ChatUiMessage } from "@/client/api/generated/model";
import { useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";

/**
 * Chat Direct API của mỗi agent session (spec 3.4, 6.1). State nằm trong `Chat` của AI SDK — không chép vào Query
 * hay store. Log chat, toolbar và composer là các organism khác nhau nên dùng chung một instance qua
 * `useChat({ chat: getSessionChat(workspaceId, sessionId) })`. `contextFiles` đọc lúc gửi từ lựa chọn trên Sidebar.
 * Chưa có session (`sessionId = null`) → Chat nháp rỗng, không bao giờ gửi (composer tạo session trước khi gửi).
 * Server lưu hội thoại sau mỗi lượt; mở lại session thì nạp lại bằng `seedSessionChat`.
 */
const chats = new Map<string, Chat<UIMessage>>();
/** Id tin nhắn nạp lại từ server: đề xuất của chúng đã xử lý ở lần trước, không đưa lại vào hàng đợi duyệt. */
const restoredIds = new Set<string>();

export function getSessionChat(workspaceId: string, sessionId: string | null): Chat<UIMessage> {
  const key = sessionId ?? `draft:${workspaceId}`;
  let chat = chats.get(key);
  if (!chat) {
    chat = new Chat<UIMessage>({
      id: sessionId ?? `draft-${workspaceId}`,
      transport: new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        body: () => ({ workspaceId, sessionId, contextFiles: [...(useWorkbenchEditorStore.getState().context[workspaceId] ?? [])] }),
      }),
    });
    chats.set(key, chat);
  }
  return chat;
}

/** Nạp hội thoại đã lưu vào Chat còn trống (mở lại session / tải lại trang). Chat đang có tin nhắn thì giữ nguyên. */
export function seedSessionChat(chat: Chat<UIMessage>, messages: readonly ChatUiMessage[]): void {
  if (chat.messages.length > 0 || messages.length === 0 || chat.status !== "ready") return;
  messages.forEach((m) => restoredIds.add(m.id));
  // Server lưu nguyên UIMessage do AI SDK sinh; schema API chỉ mô tả lỏng phần `parts`.
  chat.messages = [...messages] as unknown as UIMessage[];
}

export const isRestoredMessage = (id: string) => restoredIds.has(id);

/** Bỏ Chat của session đã xoá. */
export function forgetSessionChat(sessionId: string): void {
  chats.delete(sessionId);
}

/**
 * Lỗi của useChat → mã lỗi để dịch: lỗi trước khi stream là body `{ error: { code } }` nằm trong `message`
 * (APICallError), lỗi giữa chừng là chunk `error` có `errorText` = mã lỗi (vd "AGENT.LLM_AUTH_FAILED").
 */
export function chatErrorPayload(error: Error | undefined): unknown {
  if (!error) return null;
  const text = error.message?.trim() ?? "";
  if (text.startsWith("{")) {
    try {
      return JSON.parse(text);
    } catch {
      /* không phải JSON */
    }
  }
  return /^[A-Z_]+\.[A-Z_]+$/.test(text) ? { code: text } : error;
}
