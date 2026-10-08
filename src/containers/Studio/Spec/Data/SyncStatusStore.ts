import "server-only";
import type { SpecSyncStatus } from "@/ship/contracts/enums/sync";
import type { SpecChangedEvent } from "@/ship/contracts/events";
import { eventBus } from "@/ship/engine/eventBus";

const key = (workspaceId: string, file: string) => `${workspaceId}\u0000${file}`;
/** Bỏ event SPEC_CHANGED trùng (vd app vừa ghi file rồi watcher báo lại) trong khoảng này. */
const DEDUPE_MS = 1_500;

/**
 * Trạng thái đồng bộ của từng file spec, giữ trong bộ nhớ tiến trình (mất khi khởi động lại → mặc định SYNCED).
 * SYNCING khi pipeline 6.4 đang chạy / chờ, ERROR khi có đích lỗi, SYNCED khi mọi đích xong.
 * UNSAVED là trạng thái phía FE (đang sửa trong editor chưa lưu), BE không bao giờ trả.
 */
class SyncStatusStore {
  private readonly statuses = new Map<string, SpecSyncStatus>();
  private readonly lastEmitted = new Map<string, { signature: string; at: number }>();

  get(workspaceId: string, file: string): SpecSyncStatus {
    return this.statuses.get(key(workspaceId, file)) ?? "SYNCED";
  }

  set(workspaceId: string, file: string, status: SpecSyncStatus) {
    if (status === "SYNCED") this.statuses.delete(key(workspaceId, file));
    else this.statuses.set(key(workspaceId, file), status);
  }

  clear(workspaceId: string, file: string) {
    this.statuses.delete(key(workspaceId, file));
  }

  /** Phát SPEC_CHANGED lên eventBus (SSE chuyển tiếp ra FE), bỏ bản trùng liên tiếp. */
  announce(event: Omit<SpecChangedEvent, "type">) {
    const k = key(event.workspaceId, event.file);
    const signature = `${event.change}:${event.syncStatus}`;
    const now = Date.now();
    const last = this.lastEmitted.get(k);
    if (last && last.signature === signature && now - last.at < DEDUPE_MS) return;
    this.lastEmitted.set(k, { signature, at: now });
    if (this.lastEmitted.size > 5_000) this.lastEmitted.clear();
    eventBus.emit<SpecChangedEvent>("SPEC_CHANGED", { type: "SPEC_CHANGED", ...event });
  }
}

const globalForStatus = globalThis as unknown as { __specStudioSyncStatus?: SyncStatusStore };
export const syncStatusStore = (globalForStatus.__specStudioSyncStatus ??= new SyncStatusStore());
