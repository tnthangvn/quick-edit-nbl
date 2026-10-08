"use client";

import { useSyncExternalStore } from "react";
import { loader } from "@monaco-editor/react";

/**
 * Nạp Monaco từ package `monaco-editor` trong node_modules thay vì CDN mặc định của @monaco-editor/react
 * (app chạy local / offline). Import động để không chạy ở server; worker `editor.worker` (cần cho DiffEditor tính diff)
 * được Turbopack đóng gói qua `new Worker(new URL(..., import.meta.url))`. Markdown không cần worker ngôn ngữ riêng.
 */
let state: "idle" | "loading" | "ready" | "error" = "idle";
let promise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: typeof state) {
  state = next;
  for (const l of listeners) l();
}

export function loadMonaco(): Promise<void> {
  if (promise) return promise;
  emit("loading");
  promise = (async () => {
    const monaco = await import("monaco-editor");
    self.MonacoEnvironment = {
      getWorker: () => new Worker(new URL("monaco-editor/editor/editor.worker.js", import.meta.url), { type: "module", name: "monaco-editor-worker" }),
    };
    loader.config({ monaco });
    emit("ready");
  })().catch((err: unknown) => {
    promise = null;
    emit("error");
    throw err;
  });
  return promise;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  if (state === "idle") void loadMonaco().catch(() => {});
  return () => listeners.delete(l);
};

/** `"ready"` khi đã cấu hình loader dùng Monaco local — chỉ render `<Editor />` / `<DiffEditor />` sau đó. */
export function useMonacoStatus() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => "idle" as const,
  );
}
