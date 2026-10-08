"use client";

import { useChat } from "@ai-sdk/react";
import { useCliRunStore } from "@/client/stores/workbench-cli-store";
import { getWorkspaceChat } from "@/client/stores/workbench-chat";

/** Agent đang làm việc: chat API đang gửi / stream, hoặc run CLI của Workspace đang chạy. */
export function useAgentBusy(workspaceId: string) {
  const { status } = useChat({ chat: getWorkspaceChat(workspaceId) });
  const cliRunning = useCliRunStore((s) => s.run?.workspaceId === workspaceId && s.run.status === "RUNNING");
  const apiBusy = status === "submitted" || status === "streaming";
  return { apiBusy, cliRunning, busy: apiBusy || cliRunning };
}
