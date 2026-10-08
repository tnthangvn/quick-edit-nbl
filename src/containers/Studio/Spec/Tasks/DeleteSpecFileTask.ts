import "server-only";
import { Task } from "@/ship/parents/Task";
import { SpecFileStore } from "../Data/SpecFileStore";
import type { SpecsLocation } from "../Models/SpecFile";

export type DeleteSpecFileInput = { location: SpecsLocation; file: string };

/** Xoá file spec local. Trả tên file đã chuẩn hoá. */
export class DeleteSpecFileTask extends Task<DeleteSpecFileInput, string> {
  async run({ location, file }: DeleteSpecFileInput): Promise<string> {
    return (await SpecFileStore.open(location)).remove(file);
  }
}
