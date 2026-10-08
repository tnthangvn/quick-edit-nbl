import "server-only";
import { Task } from "@/ship/parents/Task";
import { SpecFileStore } from "../Data/SpecFileStore";
import type { SpecFileInfo, SpecsLocation } from "../Models/SpecFile";

export type WriteSpecFileInput = { location: SpecsLocation; file: string; content: string; mode: "create" | "upsert" };
export type WriteSpecFileOutput = { info: SpecFileInfo; created: boolean };

/** Ghi nguyên tử một file spec (tạo mới hoặc ghi đè). */
export class WriteSpecFileTask extends Task<WriteSpecFileInput, WriteSpecFileOutput> {
  async run({ location, file, content, mode }: WriteSpecFileInput): Promise<WriteSpecFileOutput> {
    return (await SpecFileStore.open(location)).write(file, content, mode);
  }
}
