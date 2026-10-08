import "server-only";
import path from "node:path";
import { watch, type FSWatcher } from "chokidar";
import { logger } from "@/ship/adapters/logger";

export type FileChangeKind = "CREATED" | "UPDATED" | "DELETED";
export type FileChange = { kind: FileChangeKind; /** đường dẫn tương đối so với thư mục theo dõi, phân cách "/" */ file: string };
export type FileChangeListener = (change: FileChange) => void;

type Entry = { watcher: FSWatcher; listeners: Set<FileChangeListener> };

/** Bỏ qua file/thư mục ẩn (file tạm khi ghi nguyên tử bắt đầu bằng ".") và node_modules. */
const ignored = (p: string, stats?: { isFile(): boolean }) => {
  const base = path.basename(p);
  if (base.startsWith(".") || base === "node_modules") return true;
  return !!stats?.isFile() && !base.toLowerCase().endsWith(".md");
};

const KIND: Record<string, FileChangeKind> = { add: "CREATED", change: "UPDATED", unlink: "DELETED" };

/**
 * Theo dõi file .md trong một thư mục (chokidar), dùng chung một watcher cho mọi subscriber cùng thư mục
 * (đếm tham chiếu); watcher đóng khi subscriber cuối cùng huỷ.
 */
class DirectoryWatchers {
  private readonly entries = new Map<string, Entry>();

  subscribe(dir: string, listener: FileChangeListener): () => void {
    const key = path.resolve(dir);
    let entry = this.entries.get(key);
    if (!entry) {
      const watcher = watch(key, { ignoreInitial: true, ignored, depth: 8, awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 } });
      const created: Entry = { watcher, listeners: new Set() };
      watcher.on("all", (event, absPath) => {
        const kind = KIND[event];
        if (!kind || !absPath.toLowerCase().endsWith(".md")) return;
        const file = path.relative(key, absPath).split(path.sep).join("/");
        for (const l of created.listeners) l({ kind, file });
      });
      watcher.on("error", (err) => logger.warn({ err, dir: key }, "watcher lỗi"));
      this.entries.set(key, created);
      entry = created;
    }
    entry.listeners.add(listener);

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const current = this.entries.get(key);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        this.entries.delete(key);
        void current.watcher.close();
      }
    };
  }

  /** Số watcher đang mở (dùng trong test). */
  get size() {
    return this.entries.size;
  }
}

// Giữ một instance qua hot reload của Next dev.
const globalForWatchers = globalThis as unknown as { __specStudioWatchers?: DirectoryWatchers };
export const directoryWatchers = (globalForWatchers.__specStudioWatchers ??= new DirectoryWatchers());
