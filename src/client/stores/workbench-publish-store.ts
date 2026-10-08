"use client";

import { create } from "zustand";
import type { PublishProgressEventOutput, PublishRun, PublishStepOutput, PublishTarget } from "@/client/api/generated/model";

/**
 * Tiến trình pipeline 6.4 từ SSE `PUBLISH_PROGRESS` (spec 3.3.1) + trạng thái bảng Sync Activity.
 * Không phải dữ liệu Query: `listPublishRuns` chỉ dùng một lần để khôi phục sau khi tải lại trang.
 *
 * Bảng gắn với một lần chạy gốc (`baseRunId`, sau Approve / Force Sync). "Thử lại" một đích tạo run mới chỉ có
 * LOCAL + đích đó → ghi vào `overlays[target]`, dòng của đích đó hiển thị theo run thử lại.
 */
export type RunView = { runId: string; file: string; steps: PublishStepOutput[]; finished: boolean };

export type SyncPanel = {
  file: string;
  baseRunId: string;
  overlays: Partial<Record<PublishTarget, string>>;
  collapsed: boolean;
};

export type PublishState = {
  workspaceId: string | null;
  runs: Record<string, RunView>;
  /** runId theo thứ tự cập nhật, mới nhất cuối. */
  order: string[];
  panel: SyncPanel | null;
};

type PublishActions = {
  reset: (workspaceId: string) => void;
  applyProgress: (event: Pick<PublishProgressEventOutput, "workspaceId" | "runId" | "file" | "steps" | "finished">) => void;
  seedRuns: (runs: PublishRun[]) => void;
  /** Run vừa tạo (response của forceSyncSpec): chỉ thêm khi SSE chưa đưa bản mới hơn. */
  ensureRun: (run: Pick<PublishRun, "runId" | "file" | "steps" | "finished">) => void;
  openPanel: (file: string, runId: string) => void;
  addRetry: (target: PublishTarget, run: Pick<PublishRun, "runId" | "file" | "steps" | "finished">) => void;
  setCollapsed: (collapsed: boolean) => void;
  closePanel: () => void;
};

const MAX_RUNS = 100;

/* ---------- Reducer thuần ---------- */

export function upsertRun(state: PublishState, run: RunView): PublishState {
  const order = [...state.order.filter((id) => id !== run.runId), run.runId].slice(-MAX_RUNS);
  const runs = Object.fromEntries(order.map((id) => [id, id === run.runId ? run : state.runs[id]]));
  return { ...state, runs, order };
}

export function seedRunList(state: PublishState, list: PublishRun[]): PublishState {
  // Cũ trước mới sau; run đã có (SSE đến trước) giữ bản SSE.
  const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let next = state;
  for (const r of sorted) {
    if (r.workspaceId !== state.workspaceId || next.runs[r.runId]) continue;
    next = upsertRun(next, { runId: r.runId, file: r.file, steps: r.steps, finished: r.finished });
  }
  if (!next.panel) {
    const running = [...sorted].reverse().find((r) => !r.finished && r.workspaceId === state.workspaceId);
    if (running) next = { ...next, panel: { file: running.file, baseRunId: running.runId, overlays: {}, collapsed: false } };
  }
  return next;
}

/** Các bước hiển thị trong bảng: bước của run gốc, đích đã thử lại lấy theo run thử lại. */
export function panelSteps(state: Pick<PublishState, "runs" | "panel">): PublishStepOutput[] {
  const panel = state.panel;
  if (!panel) return [];
  const base = state.runs[panel.baseRunId]?.steps ?? [];
  return base.map((step) => {
    const overlayId = panel.overlays[step.target];
    const overlay = overlayId ? state.runs[overlayId]?.steps.find((s) => s.target === step.target) : undefined;
    return overlay ?? step;
  });
}

/** Còn run nào của bảng chưa xong (run gốc chưa có event cũng tính là đang chạy). */
export function panelRunning(state: Pick<PublishState, "runs" | "panel">): boolean {
  const panel = state.panel;
  if (!panel) return false;
  const ids = [panel.baseRunId, ...Object.values(panel.overlays)].filter((id): id is string => Boolean(id));
  return ids.some((id) => !state.runs[id] || !state.runs[id].finished);
}

export type PanelSummary = { total: number; done: number; errors: number; settled: number; running: boolean };

export function summarizeSteps(steps: PublishStepOutput[], running: boolean): PanelSummary {
  const counted = steps.filter((s) => s.status !== "SKIPPED");
  return {
    total: counted.length,
    done: counted.filter((s) => s.status === "DONE").length,
    errors: counted.filter((s) => s.status === "ERROR").length,
    settled: counted.filter((s) => s.status === "DONE" || s.status === "ERROR").length,
    running,
  };
}

/** Trạng thái chip Header (Git · Drive · NBL): theo bảng nếu đang mở, không thì theo run mới nhất có đích đó. */
export function headerSteps(state: Pick<PublishState, "runs" | "order" | "panel">): Partial<Record<PublishTarget, PublishStepOutput>> {
  const out: Partial<Record<PublishTarget, PublishStepOutput>> = {};
  for (const id of state.order) {
    for (const step of state.runs[id]?.steps ?? []) if (step.target !== "LOCAL" && step.status !== "SKIPPED") out[step.target] = step;
  }
  for (const step of panelSteps(state)) if (step.target !== "LOCAL" && step.status !== "SKIPPED") out[step.target] = step;
  return out;
}

/* ---------- Store ---------- */

const initial: PublishState = { workspaceId: null, runs: {}, order: [], panel: null };

export const usePublishStore = create<PublishState & PublishActions>()((set) => ({
  ...initial,
  reset: (workspaceId) => set((s) => (s.workspaceId === workspaceId ? s : { ...initial, workspaceId })),
  applyProgress: (e) =>
    set((s) => (e.workspaceId !== s.workspaceId ? s : upsertRun(s, { runId: e.runId, file: e.file, steps: e.steps, finished: e.finished }))),
  seedRuns: (runs) => set((s) => seedRunList(s, runs)),
  ensureRun: (run) => set((s) => (s.runs[run.runId] ? s : upsertRun(s, { runId: run.runId, file: run.file, steps: run.steps, finished: run.finished }))),
  openPanel: (file, runId) => set({ panel: { file, baseRunId: runId, overlays: {}, collapsed: false } }),
  addRetry: (target, run) =>
    set((s) => {
      const withRun = s.runs[run.runId] ? s : upsertRun(s, { runId: run.runId, file: run.file, steps: run.steps, finished: run.finished });
      if (!withRun.panel) return withRun;
      return { ...withRun, panel: { ...withRun.panel, overlays: { ...withRun.panel.overlays, [target]: run.runId }, collapsed: false } };
    }),
  setCollapsed: (collapsed) => set((s) => (s.panel ? { panel: { ...s.panel, collapsed } } : s)),
  closePanel: () => set({ panel: null }),
}));
