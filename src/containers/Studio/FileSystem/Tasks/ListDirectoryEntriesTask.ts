import "server-only";
import { readdir } from "node:fs/promises";
import { Task } from "@/ship/parents/Task";

export type DirectoryEntry = { name: string };

/** Thư mục con trực tiếp của `path` (bỏ qua file), sắp theo tên. */
export class ListDirectoryEntriesTask extends Task<{ path: string }, DirectoryEntry[]> {
  async run({ path: dir }: { path: string }): Promise<DirectoryEntry[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name }));
  }
}
