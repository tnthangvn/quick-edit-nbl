"use client";

import { useChat } from "@ai-sdk/react";
import { getSessionChat } from "@/client/stores/workbench-chat";
import { useCliRunStore } from "@/client/stores/workbench-cli-store";
import { useActiveSessionId } from "@/client/stores/workbench-session-store";

/** Agent đang làm việc: chat API của phiên hiện tại đang gửi / stream, hoặc run CLI của Workspace đang chạy. */
export function useAgentBusy(workspaceId: string) {
  const sessionId = useActiveSessionId(workspaceId);
  const { status } = useChat({ chat: getSessionChat(workspaceId, sessionId) });
  const cliRunning = useCliRunStore((s) => s.run?.workspaceId === workspaceId && s.run.status === "RUNNING");
  const apiBusy = status === "submitted" || status === "streaming";
  return { apiBusy, cliRunning, busy: apiBusy || cliRunning };
}
