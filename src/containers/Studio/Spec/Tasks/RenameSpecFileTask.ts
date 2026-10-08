import "server-only";
import { Task } from "@/ship/parents/Task";
import { SpecFileStore } from "../Data/SpecFileStore";
import type { SpecFileInfo, SpecsLocation } from "../Models/SpecFile";

export type RenameSpecFileInput = { location: SpecsLocation; from: string; to: string };

export class RenameSpecFileTask extends Task<RenameSpecFileInput, { from: string; info: SpecFileInfo }> {
  async run({ location, from, to }: RenameSpecFileInput): Promise<{ from: string; info: SpecFileInfo }> {
    const store = await SpecFileStore.open(location);
    const source = await store.info(from);
    return { from: source.file, info: await store.rename(source.file, to) };
  }
}
