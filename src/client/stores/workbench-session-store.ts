"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Phiên chat Agent đang mở của mỗi Workspace (chỉ giữ id; nội dung đọc qua `getAgentSession`).
 * Không có id = chưa có phiên: phiên được tạo khi gửi prompt đầu tiên (nút New session chỉ bỏ chọn phiên hiện tại).
 */
type SessionState = { active: Record<string, string> };

type SessionActions = {
  setActive: (workspaceId: string, sessionId: string) => void;
  clearActive: (workspaceId: string) => void;
};

/* ---------- Reducer thuần ---------- */

export function withActiveSession(state: SessionState, workspaceId: string, sessionId: string | null): SessionState {
  const active = { ...state.active };
  if (sessionId) active[workspaceId] = sessionId;
  else delete active[workspaceId];
  return { active };
}

/* ---------- Store ---------- */

export const useAgentSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set) => ({
      active: {},
      setActive: (workspaceId, sessionId) => set((s) => withActiveSession(s, workspaceId, sessionId)),
      clearActive: (workspaceId) => set((s) => withActiveSession(s, workspaceId, null)),
    }),
    {
      name: "spec-studio-agent-session",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ active }) => ({ active }),
      skipHydration: true,
    },
  ),
);

export function useHydrateAgentSessionStore() {
  useEffect(() => {
    void useAgentSessionStore.persist.rehydrate();
  }, []);
}

export const useActiveSessionId = (workspaceId: string): string | null => useAgentSessionStore((s) => s.active[workspaceId] ?? null);
