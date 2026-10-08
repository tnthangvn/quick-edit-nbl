"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Vị trí khung chat Agent trên Workbench: dưới Editor, hoặc cột cao hết màn bên trái (cạnh sidebar) / bên phải. */
export const CHAT_DOCKS = ["BOTTOM", "LEFT", "RIGHT"] as const;
export type ChatDock = (typeof CHAT_DOCKS)[number];

/** Chiều rộng cột chat khi neo trái / phải (px). */
export const CHAT_PANEL_WIDTH = { min: 320, max: 800, default: 420 } as const;

/** Client-state giao diện chung (không phải dữ liệu server): sidebar thu gọn, vị trí + chiều rộng khung chat. Lưu localStorage. */
type UiState = {
  sidebarCollapsed: boolean;
  chatDock: ChatDock;
  chatPanelWidth: number;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setChatDock: (dock: ChatDock) => void;
  setChatPanelWidth: (width: number) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      chatDock: "BOTTOM",
      chatPanelWidth: CHAT_PANEL_WIDTH.default,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setChatDock: (chatDock) => set({ chatDock }),
      setChatPanelWidth: (width) =>
        set({ chatPanelWidth: Math.round(Math.min(CHAT_PANEL_WIDTH.max, Math.max(CHAT_PANEL_WIDTH.min, width))) }),
    }),
    // Không tự hydrate lúc tạo store (tránh lệch SSR); gọi `useHydrateUiStore()` một lần ở client.
    { name: "spec-studio-ui", version: 1, skipHydration: true },
  ),
);

/** Nạp state đã lưu từ localStorage sau khi mount. */
export function useHydrateUiStore() {
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);
}
