import "server-only";
import { Task } from "@/ship/parents/Task";
import { SpecFileStore } from "../Data/SpecFileStore";
import { syncStatusStore } from "../Data/SyncStatusStore";
import type { SpecFileWithStatus, SpecsLocation } from "../Models/SpecFile";

export type ReadSpecFileInput = { workspaceId: string; location: SpecsLocation; file: string };
export type ReadSpecFileOutput = SpecFileWithStatus & { content: string };

export class ReadSpecFileTask extends Task<ReadSpecFileInput, ReadSpecFileOutput> {
  async run({ workspaceId, location, file }: ReadSpecFileInput): Promise<ReadSpecFileOutput> {
    const { info, content } = await (await SpecFileStore.open(location)).read(file);
    return { ...info, syncStatus: syncStatusStore.get(workspaceId, info.file), content };
  }
}
