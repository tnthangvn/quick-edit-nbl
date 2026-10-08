import "server-only";
import { cp, lstat, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { SandboxFailedException } from "../Exceptions/CliRunnerExceptions";
import type { Sandbox } from "../Models/Sandbox";
import { hashMarkdownFiles, SKIPPED_DIRS } from "../Sandbox/markdownFiles";

/**
 * Chép specsDir vào thư mục tạm để CLI agent sửa trên bản sao, không chạm file thật (spec 2.5).
 * Bỏ qua .git, node_modules và mọi symlink (symlink có thể trỏ ra file thật ngoài sandbox).
 */
export class PrepareSandboxTask extends Task<{ specsDir: string }, Sandbox> {
  async run({ specsDir }: { specsDir: string }): Promise<Sandbox> {
    let root: string | undefined;
    try {
      if (!(await lstat(specsDir)).isDirectory()) throw new Error("specsDir không phải thư mục");
      root = await mkdtemp(path.join(os.tmpdir(), "spec-studio-run-"));
      const dir = path.join(root, "specs");
      await cp(specsDir, dir, {
        recursive: true,
        filter: async (src) => {
          const stat = await lstat(src);
          if (stat.isSymbolicLink()) return false;
          return !(src !== specsDir && stat.isDirectory() && SKIPPED_DIRS.has(path.basename(src)));
        },
      });
      return { root, dir, baseline: await hashMarkdownFiles(dir) };
    } catch (err) {
      if (root) await rm(root, { recursive: true, force: true });
      throw new SandboxFailedException(undefined, { cause: err });
    }
  }
}
