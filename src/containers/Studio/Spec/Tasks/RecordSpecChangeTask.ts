import "server-only";
import type { SpecSyncStatus } from "@/ship/contracts/enums/sync";
import type { SpecChangedEvent } from "@/ship/contracts/events";
import { Task } from "@/ship/parents/Task";
import { syncStatusStore } from "../Data/SyncStatusStore";

export type RecordSpecChangeInput = {
  workspaceId: string;
  file: string;
  change: SpecChangedEvent["change"];
  /** Bỏ trống = giữ trạng thái hiện tại. */
  syncStatus?: SpecSyncStatus;
};

/** Cập nhật trạng thái sync của file và phát SPEC_CHANGED (xoá file thì xoá luôn trạng thái). */
export class RecordSpecChangeTask extends Task<RecordSpecChangeInput, SpecSyncStatus> {
  async run({ workspaceId, file, change, syncStatus }: RecordSpecChangeInput): Promise<SpecSyncStatus> {
    if (change === "DELETED") syncStatusStore.clear(workspaceId, file);
    else if (syncStatus) syncStatusStore.set(workspaceId, file, syncStatus);
    const status = syncStatusStore.get(workspaceId, file);
    syncStatusStore.announce({ workspaceId, file, change, syncStatus: status });
    return status;
  }
}
