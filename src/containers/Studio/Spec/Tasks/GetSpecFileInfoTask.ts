import "server-only";
import { Task } from "@/ship/parents/Task";
import { SpecFileStore } from "../Data/SpecFileStore";
import type { SpecFileInfo, SpecsLocation } from "../Models/SpecFile";

export type GetSpecFileInfoInput = { location: SpecsLocation; file: string };
export type GetSpecFileInfoOutput = SpecFileInfo & { absolutePath: string };

/** Kích thước, thời điểm sửa và đường dẫn tuyệt đối (đã qua path guard) của một file spec. */
export class GetSpecFileInfoTask extends Task<GetSpecFileInfoInput, GetSpecFileInfoOutput> {
  async run({ location, file }: GetSpecFileInfoInput): Promise<GetSpecFileInfoOutput> {
    const store = await SpecFileStore.open(location);
    const info = await store.info(file);
    return { ...info, absolutePath: (await store.resolve(info.file)).abs };
  }
}
