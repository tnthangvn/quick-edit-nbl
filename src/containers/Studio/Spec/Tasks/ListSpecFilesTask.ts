import "server-only";
import { Task } from "@/ship/parents/Task";
import { SpecFileStore } from "../Data/SpecFileStore";
import { syncStatusStore } from "../Data/SyncStatusStore";
import type { SpecFileWithStatus, SpecsLocation } from "../Models/SpecFile";

export type ListSpecFilesInput = { workspaceId: string; location: SpecsLocation };

/** Liệt kê file .md trong thư mục spec (đệ quy, bỏ thư mục ẩn) kèm trạng thái sync. */
export class ListSpecFilesTask extends Task<ListSpecFilesInput, SpecFileWithStatus[]> {
  async run({ workspaceId, location }: ListSpecFilesInput): Promise<SpecFileWithStatus[]> {
    const files = await (await SpecFileStore.open(location)).list();
    return files.map((f) => ({ ...f, syncStatus: syncStatusStore.get(workspaceId, f.file) }));
  }
}
