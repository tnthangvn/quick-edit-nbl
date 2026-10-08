import "server-only";
import { directoryWatchers } from "@/ship/adapters/watcher";
import { Task } from "@/ship/parents/Task";
import { SpecFileStore } from "../Data/SpecFileStore";
import { syncStatusStore } from "../Data/SyncStatusStore";
import type { SpecsLocation } from "../Models/SpecFile";

export type WatchSpecsDirInput = { workspaceId: string; location: SpecsLocation };

/**
 * Theo dõi thư mục spec (watcher dùng chung theo thư mục, đếm tham chiếu) và phát SPEC_CHANGED khi file .md
 * đổi ngoài app (editor khác, git pull...). Trả hàm huỷ; watcher đóng khi không còn ai theo dõi.
 */
export class WatchSpecsDirTask extends Task<WatchSpecsDirInput, () => void> {
  async run({ workspaceId, location }: WatchSpecsDirInput): Promise<() => void> {
    const { root } = await SpecFileStore.open(location);
    return directoryWatchers.subscribe(root, ({ kind, file }) => {
      if (kind === "DELETED") syncStatusStore.clear(workspaceId, file);
      syncStatusStore.announce({ workspaceId, file, change: kind, syncStatus: syncStatusStore.get(workspaceId, file) });
    });
  }
}
