"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CliLogStream, CliRunEvent, CliRunStatus, CliRunStatusEventError } from "@/client/api/generated/model";

/**
 * Lần chạy CLI Agent hiện tại (spec 3.4, chế độ CLI): event từ SSE `/api/agent/runs/{runId}/events`.
 * Server phát lại toàn bộ event khi nối lại → bỏ qua `seq` đã có. `runId` lưu sessionStorage để tải lại trang vẫn
 * nối lại được run đang chạy (event dựng lại từ bản phát lại, không lưu).
 */
export type CliRun = {
  runId: string;
  workspaceId: string;
  /** Phiên chat chứa run; run kết thúc được lưu vào phiên này (đọc lại qua `getAgentSession`). */
  sessionId: string;
  prompt: string;
  profileId: string;
  events: CliRunEvent[];
  lastSeq: number;
  status: CliRunStatus;
  exitCode: number | null;
  error: CliRunStatusEventError;
};

type CliActions = {
  start: (meta: Pick<CliRun, "runId" | "workspaceId" | "sessionId" | "prompt" | "profileId">) => void;
  apply: (event: CliRunEvent) => void;
  /** Mất run (server khởi động lại / 404): kết thúc ở trạng thái hiện có. */
  markLost: (runId: string) => void;
  clear: () => void;
};

/* ---------- Reducer thuần ---------- */

export function newCliRun(meta: Pick<CliRun, "runId" | "workspaceId" | "sessionId" | "prompt" | "profileId">): CliRun {
  return { ...meta, events: [], lastSeq: -1, status: "RUNNING", exitCode: null, error: null };
}

export function applyCliEvent(run: CliRun, event: CliRunEvent): CliRun {
  if (event.runId !== run.runId || event.seq <= run.lastSeq) return run;
  const next: CliRun = { ...run, events: [...run.events, event], lastSeq: event.seq };
  if (event.type === "STATUS") {
    next.status = event.status;
    next.exitCode = event.exitCode;
    next.error = event.error;
  }
  return next;
}

export type CliTimelineItem =
  | { kind: "log"; key: string; text: string; streams: CliLogStream[] }
  | { kind: "tool"; key: string; name: string; input: string }
  | { kind: "message"; key: string; text: string }
  | { kind: "proposal"; key: string; file: string; isNewFile: boolean };

/** Gộp event thành dòng thời gian hiển thị: LOG liền nhau gộp một khối, MESSAGE delta nối vào tin nhắn trước. */
export function buildCliTimeline(events: readonly CliRunEvent[]): CliTimelineItem[] {
  const items: CliTimelineItem[] = [];
  for (const e of events) {
    const last = items.at(-1);
    switch (e.type) {
      case "LOG":
        if (last?.kind === "log") {
          last.text = `${last.text}\n${e.text}`;
          if (!last.streams.includes(e.stream)) last.streams.push(e.stream);
        } else items.push({ kind: "log", key: `log-${e.seq}`, text: e.text, streams: [e.stream] });
        break;
      case "MESSAGE":
        if (e.delta && last?.kind === "message") last.text += e.text;
        else items.push({ kind: "message", key: `msg-${e.seq}`, text: e.text });
        break;
      case "TOOL_CALL":
        items.push({ kind: "tool", key: `tool-${e.seq}`, name: e.name, input: e.input });
        break;
      case "PROPOSAL":
        items.push({ kind: "proposal", key: `prop-${e.seq}`, file: e.file, isNewFile: e.isNewFile });
        break;
      default:
        break;
    }
  }
  return items;
}

/* ---------- Store ---------- */

export const useCliRunStore = create<{ run: CliRun | null } & CliActions>()(
  persist(
    (set) => ({
      run: null,
      start: (meta) => set({ run: newCliRun(meta) }),
      apply: (event) => set((s) => (s.run ? { run: applyCliEvent(s.run, event) } : s)),
      markLost: (runId) =>
        set((s) => (s.run?.runId === runId && s.run.status === "RUNNING" ? { run: { ...s.run, status: "FAILED" } } : s)),
      clear: () => set({ run: null }),
    }),
    {
      name: "spec-studio-cli-run",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // Chỉ giữ định danh run; event được server phát lại khi nối lại.
      partialize: ({ run }) => ({ run: run ? { ...run, events: [], lastSeq: -1 } : null }),
      skipHydration: true,
    },
  ),
);

export function useHydrateCliRunStore() {
  useEffect(() => {
    void useCliRunStore.persist.rehydrate();
  }, []);
}
