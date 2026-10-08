import "server-only";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Action } from "@/ship/parents/Action";
import { DirectoryNotFoundException } from "../Exceptions/DirectoryNotFoundException";
import { ListDirectoryEntriesTask, type DirectoryEntry } from "../Tasks/ListDirectoryEntriesTask";

export type BrowseDirectoryResult = { path: string; parent: string | null; writable: boolean; entries: DirectoryEntry[] };

/** Duyệt thư mục cho dialog chọn thư mục (Wizard, Settings). Không liệt kê file, chỉ thư mục con. Bỏ trống `path` = thư mục home. */
export class BrowseDirectoryAction extends Action<{ path?: string }, BrowseDirectoryResult> {
  constructor(private readonly listEntries = new ListDirectoryEntriesTask()) {
    super();
  }

  async run({ path: input }: { path?: string }): Promise<BrowseDirectoryResult> {
    const dir = input ? path.resolve(input) : path.resolve(os.homedir());
    const info = await stat(dir).catch(() => undefined);
    if (!info?.isDirectory()) throw new DirectoryNotFoundException({ path: dir });

    const [writable, entries] = await Promise.all([
      access(dir, constants.W_OK).then(
        () => true,
        () => false,
      ),
      this.listEntries.run({ path: dir }),
    ]);
    const parent = path.dirname(dir);
    return { path: dir, parent: parent === dir ? null : parent, writable, entries };
  }
}
