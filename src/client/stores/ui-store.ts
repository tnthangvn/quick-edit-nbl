"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Client-state giao diện chung (không phải dữ liệu server): sidebar thu gọn. Lưu localStorage. */
type UiState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
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
