import "server-only";
import { cp, lstat, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { SandboxFailedException } from "../Exceptions/CliRunnerExceptions";
import { SANDBOX_PREFIX, sessionSandboxRoot, type Sandbox } from "../Models/Sandbox";
import { hashMarkdownFiles, SKIPPED_DIRS } from "../Sandbox/markdownFiles";

export type PrepareSandboxInput = {
  specsDir: string;
  /** Có: sandbox cố định của agent session (chép lại bản mới nhất mỗi run, không đổi đường dẫn). Không: thư mục tạm ngẫu nhiên. */
  sessionId?: string;
};

/**
 * Chép specsDir vào thư mục tạm để CLI agent sửa trên bản sao, không chạm file thật (spec 2.5).
 * Bỏ qua .git, node_modules và mọi symlink (symlink có thể trỏ ra file thật ngoài sandbox).
 */
export class PrepareSandboxTask extends Task<PrepareSandboxInput, Sandbox> {
  async run({ specsDir, sessionId }: PrepareSandboxInput): Promise<Sandbox> {
    let root: string | undefined;
    const persistent = Boolean(sessionId);
    try {
      if (!(await lstat(specsDir)).isDirectory()) throw new Error("specsDir không phải thư mục");
      if (sessionId) {
        if (!/^[\w-]+$/.test(sessionId)) throw new Error("sessionId không hợp lệ");
        root = sessionSandboxRoot(sessionId);
        await mkdir(root, { recursive: true });
      } else {
        root = await mkdtemp(path.join(os.tmpdir(), SANDBOX_PREFIX));
      }
      const dir = path.join(root, "specs");
      // Bản trước của session có thể đã lệch file thật (đề xuất bị từ chối / file sửa tay): chép lại từ đầu.
      await rm(dir, { recursive: true, force: true });
      await cp(specsDir, dir, {
        recursive: true,
        filter: async (src) => {
          const stat = await lstat(src);
          if (stat.isSymbolicLink()) return false;
          return !(src !== specsDir && stat.isDirectory() && SKIPPED_DIRS.has(path.basename(src)));
        },
      });
      return { root, dir, persistent, baseline: await hashMarkdownFiles(dir) };
    } catch (err) {
      if (root && !persistent) await rm(root, { recursive: true, force: true });
      throw new SandboxFailedException(undefined, { cause: err });
    }
  }
}
