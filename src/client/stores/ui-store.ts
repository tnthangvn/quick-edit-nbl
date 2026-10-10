"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Vị trí khung chat Agent trên Workbench: dưới Editor, hoặc cột cao hết màn bên trái (cạnh sidebar) / bên phải. */
export const CHAT_DOCKS = ["BOTTOM", "LEFT", "RIGHT"] as const;
export type ChatDock = (typeof CHAT_DOCKS)[number];

/** Chiều rộng cột chat khi neo trái / phải (px). */
export const CHAT_PANEL_WIDTH = { min: 320, max: 800, default: 420 } as const;

/** Chế độ xem của Editor: chỉ editor, editor + diff bản nháp, editor + preview. Giữ nguyên khi đổi file. */
export const EDITOR_VIEWS = ["SOURCE", "DIFF", "PREVIEW"] as const;
export type EditorView = (typeof EDITOR_VIEWS)[number];

/** Tỉ lệ cột editor khi chia đôi với diff / preview. */
export const EDITOR_SPLIT_RATIO = { min: 0.2, max: 0.8, default: 0.5 } as const;

/** Client-state giao diện chung (không phải dữ liệu server): sidebar thu gọn, vị trí + chiều rộng khung chat,
 * chế độ xem + tỉ lệ chia của Editor. Lưu localStorage. */
type UiState = {
  sidebarCollapsed: boolean;
  chatDock: ChatDock;
  chatPanelWidth: number;
  editorView: EditorView;
  editorSplitRatio: number;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setChatDock: (dock: ChatDock) => void;
  setChatPanelWidth: (width: number) => void;
  setEditorView: (view: EditorView) => void;
  setEditorSplitRatio: (ratio: number) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      chatDock: "BOTTOM",
      chatPanelWidth: CHAT_PANEL_WIDTH.default,
      editorView: "SOURCE",
      editorSplitRatio: EDITOR_SPLIT_RATIO.default,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setChatDock: (chatDock) => set({ chatDock }),
      setChatPanelWidth: (width) =>
        set({ chatPanelWidth: Math.round(Math.min(CHAT_PANEL_WIDTH.max, Math.max(CHAT_PANEL_WIDTH.min, width))) }),
      setEditorView: (editorView) => set({ editorView }),
      setEditorSplitRatio: (ratio) => set({ editorSplitRatio: Math.min(EDITOR_SPLIT_RATIO.max, Math.max(EDITOR_SPLIT_RATIO.min, ratio)) }),
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
