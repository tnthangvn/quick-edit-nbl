import "server-only";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";

/** Thêm một dòng vào <repoPath>/.gitignore nếu chưa có (vd ".spec-studio/", spec 5.1). Trả true nếu đã thêm. */
export class AddGitignoreEntryTask extends Task<{ repoPath: string; entry: string }, boolean> {
  async run({ repoPath, entry }: { repoPath: string; entry: string }): Promise<boolean> {
    const file = path.join(repoPath, ".gitignore");
    const current = await readFile(file, "utf8").catch(() => "");
    const bare = entry.replace(/^\/|\/$/g, "");
    const present = current.split(/\r?\n/).some((line) => line.trim().replace(/^\/|\/$/g, "") === bare);
    if (present) return false;
    await appendFile(file, `${current && !current.endsWith("\n") ? "\n" : ""}# Spec Studio (cấu hình local, không commit)\n${entry}\n`);
    return true;
  }
}
