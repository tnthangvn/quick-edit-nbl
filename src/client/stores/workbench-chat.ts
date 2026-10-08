"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";

/**
 * Phiên chat Direct API của mỗi Workspace (spec 3.4, 6.1). State nằm trong `Chat` của AI SDK — không chép vào Query
 * hay store. Log chat, toolbar và composer là các organism khác nhau nên dùng chung một instance qua
 * `useChat({ chat: getWorkspaceChat(id) })`. `contextFiles` đọc lúc gửi từ lựa chọn trên Sidebar.
 */
const chats = new Map<string, Chat<UIMessage>>();

export function getWorkspaceChat(workspaceId: string): Chat<UIMessage> {
  let chat = chats.get(workspaceId);
  if (!chat) {
    chat = new Chat<UIMessage>({
      id: `chat-${workspaceId}`,
      transport: new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        body: () => ({ workspaceId, contextFiles: [...(useWorkbenchEditorStore.getState().context[workspaceId] ?? [])] }),
      }),
    });
    chats.set(workspaceId, chat);
  }
  return chat;
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
