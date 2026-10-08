"use client";

import { create } from "zustand";
import type { SseStatus } from "@/client/sse/event-source";

/** Trạng thái kết nối SSE của Workbench: luồng event Workspace và luồng run CLI. */
export const useWorkbenchConnectionStore = create<{
  workspaceEvents: SseStatus;
  cliRun: SseStatus;
  setWorkspaceEvents: (status: SseStatus) => void;
  setCliRun: (status: SseStatus) => void;
}>()((set) => ({
  workspaceEvents: "idle",
  cliRun: "idle",
  setWorkspaceEvents: (workspaceEvents) => set({ workspaceEvents }),
  setCliRun: (cliRun) => set({ cliRun }),
}));
