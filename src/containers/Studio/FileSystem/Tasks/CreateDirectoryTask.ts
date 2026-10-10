import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { DirectoryExistsException } from "../Exceptions/DirectoryExistsException";
import { DirectoryNotFoundException } from "../Exceptions/DirectoryNotFoundException";
import { DirectoryNotWritableException } from "../Exceptions/DirectoryNotWritableException";

/** Tạo một thư mục con (một cấp, không đệ quy) trong `parent`. Tên đã được validate ở Request (không có / \ hay ".."). */
export class CreateDirectoryTask extends Task<{ parent: string; name: string }, { path: string }> {
  async run({ parent, name }: { parent: string; name: string }): Promise<{ path: string }> {
    const dir = path.join(path.resolve(parent), name);
    try {
      await mkdir(dir, { mode: 0o755 });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EEXIST") throw new DirectoryExistsException({ path: dir });
      if (code === "ENOENT" || code === "ENOTDIR") throw new DirectoryNotFoundException({ path: path.resolve(parent) });
      if (code === "EACCES" || code === "EPERM" || code === "EROFS") throw new DirectoryNotWritableException({ path: path.resolve(parent) });
      throw err;
    }
    return { path: dir };
  }
}
