import "server-only";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import type { SandboxChange } from "../Models/Sandbox";
import { listMarkdownFiles, sha256 } from "../Sandbox/markdownFiles";

export type DiffSandboxInput = {
  /** specsDir thật. */
  originalDir: string;
  sandboxDir: string;
  baseline: Map<string, string>;
};

/** Tối đa số file đề xuất trong một run. */
const MAX_CHANGES = 100;

async function readRegularFile(file: string): Promise<string | undefined> {
  try {
    const stat = await lstat(file);
    return stat.isFile() ? await readFile(file, "utf8") : undefined;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

/**
 * So sánh sandbox với mốc lúc chép: chỉ file .md CLI đã sửa / tạo mới mới thành đề xuất.
 * `original` lấy nội dung hiện tại trên đĩa (người dùng có thể đã sửa trong lúc run chạy); file người dùng sửa
 * mà CLI không đụng tới không bị đề xuất ghi đè. File CLI xoá không được đề xuất.
 */
export class DiffSandboxTask extends Task<DiffSandboxInput, SandboxChange[]> {
  async run({ originalDir, sandboxDir, baseline }: DiffSandboxInput): Promise<SandboxChange[]> {
    const changes: SandboxChange[] = [];
    for (const file of await listMarkdownFiles(sandboxDir)) {
      if (changes.length >= MAX_CHANGES) break;
      const proposed = await readFile(path.join(sandboxDir, file), "utf8");
      if (baseline.get(file) === sha256(proposed)) continue;

      const original = await readRegularFile(path.join(originalDir, file));
      if (original === proposed) continue;
      changes.push({ file, original: original ?? "", proposed, isNewFile: original === undefined });
    }
    return changes;
  }
}
