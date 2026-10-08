"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

/**
 * Client-state của Workbench theo từng Workspace (spec 3.2, 3.3):
 * - `openFiles`: file đang mở trên Editor;
 * - `context`: spec được tick để đính kèm vào context của Agent;
 * - `drafts`: bản nháp chưa Approve & Save (chỉ giữ khi khác nội dung trên đĩa) — đây là "autosave" phía client,
 *   lưu localStorage để không mất khi tải lại trang. Nội dung đã lưu vẫn đọc qua Query (`getSpec`), store không chép.
 */
export type WorkbenchEditorState = {
  openFiles: Record<string, string | null>;
  context: Record<string, string[]>;
  drafts: Record<string, string>;
};

type WorkbenchEditorActions = {
  openFile: (workspaceId: string, file: string | null) => void;
  setContextChecked: (workspaceId: string, file: string, checked: boolean) => void;
  setContext: (workspaceId: string, files: string[]) => void;
  /** Lưu nháp; trùng `saved` (nội dung trên đĩa) thì xoá nháp. */
  setDraft: (workspaceId: string, file: string, content: string, saved: string | undefined) => void;
  clearDraft: (workspaceId: string, file: string) => void;
  renameFile: (workspaceId: string, from: string, to: string) => void;
  removeFile: (workspaceId: string, file: string) => void;
  /** Bỏ file không còn tồn tại (sau khi danh sách spec tải lại). */
  pruneFiles: (workspaceId: string, existing: readonly string[]) => void;
};

export const draftKey = (workspaceId: string, file: string) => `${workspaceId}\u0000${file}`;

const EMPTY: readonly string[] = [];

/* ---------- Reducer thuần (test được) ---------- */

export function withContext(state: WorkbenchEditorState, workspaceId: string, file: string, checked: boolean): Partial<WorkbenchEditorState> {
  const current = state.context[workspaceId] ?? [];
  const has = current.includes(file);
  if (checked === has) return {};
  const next = checked ? [...current, file] : current.filter((f) => f !== file);
  return { context: { ...state.context, [workspaceId]: next } };
}

export function withDraft(state: WorkbenchEditorState, workspaceId: string, file: string, content: string, saved: string | undefined): Partial<WorkbenchEditorState> {
  const key = draftKey(workspaceId, file);
  if (saved !== undefined && content === saved) {
    if (!(key in state.drafts)) return {};
    const { [key]: _removed, ...rest } = state.drafts;
    return { drafts: rest };
  }
  if (state.drafts[key] === content) return {};
  return { drafts: { ...state.drafts, [key]: content } };
}

export function withRename(state: WorkbenchEditorState, workspaceId: string, from: string, to: string): Partial<WorkbenchEditorState> {
  const fromKey = draftKey(workspaceId, from);
  const drafts = { ...state.drafts };
  if (fromKey in drafts) {
    drafts[draftKey(workspaceId, to)] = drafts[fromKey];
    delete drafts[fromKey];
  }
  const ctx = state.context[workspaceId] ?? [];
  return {
    drafts,
    context: { ...state.context, [workspaceId]: ctx.map((f) => (f === from ? to : f)) },
    openFiles: state.openFiles[workspaceId] === from ? { ...state.openFiles, [workspaceId]: to } : state.openFiles,
  };
}

export function withoutFiles(state: WorkbenchEditorState, workspaceId: string, keep: (file: string) => boolean): Partial<WorkbenchEditorState> {
  const prefix = draftKey(workspaceId, "");
  const drafts = Object.fromEntries(Object.entries(state.drafts).filter(([k]) => !k.startsWith(prefix) || keep(k.slice(prefix.length))));
  const ctx = state.context[workspaceId] ?? [];
  const open = state.openFiles[workspaceId];
  return {
    drafts,
    context: { ...state.context, [workspaceId]: ctx.filter(keep) },
    openFiles: open && !keep(open) ? { ...state.openFiles, [workspaceId]: null } : state.openFiles,
  };
}

/* ---------- Store ---------- */

export const useWorkbenchEditorStore = create<WorkbenchEditorState & WorkbenchEditorActions>()(
  persist(
    (set) => ({
      openFiles: {},
      context: {},
      drafts: {},
      openFile: (workspaceId, file) => set((s) => ({ openFiles: { ...s.openFiles, [workspaceId]: file } })),
      setContextChecked: (workspaceId, file, checked) => set((s) => withContext(s, workspaceId, file, checked)),
      setContext: (workspaceId, files) => set((s) => ({ context: { ...s.context, [workspaceId]: [...new Set(files)] } })),
      setDraft: (workspaceId, file, content, saved) => set((s) => withDraft(s, workspaceId, file, content, saved)),
      clearDraft: (workspaceId, file) => set((s) => withDraft(s, workspaceId, file, "", "")),
      renameFile: (workspaceId, from, to) => set((s) => withRename(s, workspaceId, from, to)),
      removeFile: (workspaceId, file) => set((s) => withoutFiles(s, workspaceId, (f) => f !== file)),
      pruneFiles: (workspaceId, existing) => {
        const set_ = new Set(existing);
        set((s) => withoutFiles(s, workspaceId, (f) => set_.has(f)));
      },
    }),
    {
      name: "spec-studio-workbench",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ openFiles, context, drafts }) => ({ openFiles, context, drafts }),
      // Không tự hydrate lúc tạo store (tránh lệch SSR); gọi `useHydrateWorkbenchEditorStore()` ở client.
      skipHydration: true,
    },
  ),
);

/** Nạp state đã lưu từ localStorage sau khi mount. */
export function useHydrateWorkbenchEditorStore() {
  useEffect(() => {
    void useWorkbenchEditorStore.persist.rehydrate();
  }, []);
}

/* ---------- Selector ---------- */

export const useOpenFile = (workspaceId: string) => useWorkbenchEditorStore((s) => s.openFiles[workspaceId] ?? null);

export const useContextFiles = (workspaceId: string) => useWorkbenchEditorStore((s) => (s.context[workspaceId] ?? EMPTY) as readonly string[]);

export const useDraft = (workspaceId: string, file: string | null) =>
  useWorkbenchEditorStore((s) => (file ? s.drafts[draftKey(workspaceId, file)] : undefined));

/** Danh sách file đang có nháp (UNSAVED). */
export const useDirtyFiles = (workspaceId: string) =>
  useWorkbenchEditorStore(
    useShallow((s) => {
      const prefix = draftKey(workspaceId, "");
      return Object.keys(s.drafts)
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length));
    }),
  );
