"use client";

import { useCallback, useEffect, useRef } from "react";
import { startCliRun, stopCliRun } from "@/client/api/generated";
import type { CliRunEvent } from "@/client/api/generated/model";
import { useEventSource } from "@/client/sse/use-event-source";
import { useCliRunStore } from "@/client/stores/workbench-cli-store";
import { useWorkbenchConnectionStore } from "@/client/stores/workbench-connection-store";

const runEventsUrl = (runId: string) => `/api/agent/runs/${encodeURIComponent(runId)}/events`;

/**
 * Nghe SSE của run CLI hiện tại (`/api/agent/runs/{runId}/events`). Server phát lại từ đầu khi nối lại → store bỏ qua
 * `seq` đã có. Đóng kết nối khi STATUS ≠ RUNNING. Run không còn trên server (404 → EventSource đóng) → đánh dấu mất.
 * Gọi một lần trong Workbench.
 */
export function useCliRunStream(workspaceId: string) {
  const run = useCliRunStore((s) => (s.run?.workspaceId === workspaceId ? s.run : null));
  const runId = run?.runId ?? null;
  // Kết nối khi đang chạy, hoặc sau khi tải lại trang (chưa có event) để server phát lại.
  const enabled = Boolean(run && (run.status === "RUNNING" || run.events.length === 0));

  const { status } = useEventSource<CliRunEvent>(runId ? runEventsUrl(runId) : null, {
    enabled,
    onEvent: (event) => useCliRunStore.getState().apply(event),
  });

  useEffect(() => {
    useWorkbenchConnectionStore.getState().setCliRun(status);
    if (status === "closed" && runId) useCliRunStore.getState().markLost(runId);
  }, [status, runId]);
}

/** Bắt đầu / dừng run CLI (POST /api/agent/runs → 202 { runId }; DELETE /api/agent/runs/{runId}). Lỗi ném ra cho UI dịch. */
export function useCliRunActions(workspaceId: string) {
  const starting = useRef(false);

  const start = useCallback(
    async (input: { sessionId: string; profileId: string; prompt: string; contextFiles: string[] }) => {
      if (starting.current) return;
      starting.current = true;
      try {
        const { runId } = await startCliRun({ workspaceId, ...input });
        useCliRunStore.getState().start({ runId, workspaceId, sessionId: input.sessionId, prompt: input.prompt, profileId: input.profileId });
      } finally {
        starting.current = false;
      }
    },
    [workspaceId],
  );

  const stop = useCallback(async () => {
    const run = useCliRunStore.getState().run;
    if (run && run.status === "RUNNING") await stopCliRun(run.runId);
  }, []);

  return { start, stop };
}
