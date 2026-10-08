import "server-only";
import { randomBytes } from "node:crypto";
import { realpath, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runGit, type GitRunner } from "@/ship/adapters/git";
import { Task } from "@/ship/parents/Task";
import { gitFailure } from "../Exceptions/mapFailures";

export type CommitToBranchInput = {
  cwd: string;
  /** Branch đích (vd spec/2026-10-08-sidebar), có thể chưa tồn tại. */
  branch: string;
  /** Branch gốc để rẽ nhánh khi `branch` chưa có. */
  baseBranch: string;
  /** File cần đưa vào commit (tuyệt đối hoặc tương đối với gốc repo). File không còn trên đĩa → xoá khỏi commit. */
  files: string[];
  message: string;
  /** Có remote: lấy đầu branch / base mới nhất trên remote làm commit cha (để push fast-forward). */
  remote?: { url: string; env: Record<string, string> };
};
export type CommitToBranchOutput = { committed: boolean; sha: string | null };

/**
 * Commit nội dung file hiện tại trong working tree lên một branch KHÁC branch đang checkout mà không đổi working tree
 * (index tạm + write-tree + commit-tree + update-ref). Dùng cho publishMode = PULL_REQUEST.
 */
export class CommitToBranchTask extends Task<CommitToBranchInput, CommitToBranchOutput> {
  constructor(private readonly git: GitRunner = runGit) {
    super();
  }

  async run(input: CommitToBranchInput): Promise<CommitToBranchOutput> {
    const { cwd, branch, files, message } = input;
    const top = await this.git(["rev-parse", "--show-toplevel"], { cwd });
    if (top.exitCode !== 0) throw gitFailure("rev-parse", top);
    const toplevel = await realpath(top.stdout.trim());

    const { parent, branchExists } = await this.parent(input);
    const indexFile = path.join(os.tmpdir(), `spec-studio-index-${randomBytes(6).toString("hex")}`);
    const env = { GIT_INDEX_FILE: indexFile };
    try {
      const read = await this.git(["read-tree", parent], { cwd: toplevel, env });
      if (read.exitCode !== 0) throw gitFailure("read-tree", read);

      for (const file of files) {
        const abs = path.isAbsolute(file) ? file : path.join(toplevel, file);
        const real = await realpath(abs).catch(() => abs);
        const rel = path.relative(toplevel, real).split(path.sep).join("/");
        const exists = await stat(real).then((s) => s.isFile(), () => false);
        if (exists) {
          const blob = await this.git(["hash-object", "-w", "--", real], { cwd: toplevel });
          if (blob.exitCode !== 0) throw gitFailure("hash-object", blob);
          const upd = await this.git(["update-index", "--add", "--cacheinfo", `100644,${blob.stdout.trim()},${rel}`], { cwd: toplevel, env });
          if (upd.exitCode !== 0) throw gitFailure("update-index", upd);
        } else {
          const upd = await this.git(["update-index", "--force-remove", "--", rel], { cwd: toplevel, env });
          if (upd.exitCode !== 0) throw gitFailure("update-index", upd);
        }
      }

      const tree = await this.git(["write-tree"], { cwd: toplevel, env });
      if (tree.exitCode !== 0) throw gitFailure("write-tree", tree);
      const parentTree = await this.git(["rev-parse", `${parent}^{tree}`], { cwd: toplevel });
      if (tree.stdout.trim() === parentTree.stdout.trim()) return { committed: false, sha: branchExists ? parent : null };

      const commit = await this.git(["commit-tree", tree.stdout.trim(), "-p", parent, "-m", message], { cwd: toplevel });
      if (commit.exitCode !== 0) throw gitFailure("commit", commit);
      const sha = commit.stdout.trim();
      const ref = await this.git(["update-ref", `refs/heads/${branch}`, sha], { cwd: toplevel });
      if (ref.exitCode !== 0) throw gitFailure("update-ref", ref);
      return { committed: true, sha };
    } finally {
      await rm(indexFile, { force: true });
    }
  }

  /** Commit cha: đầu branch (remote → local) nếu đã có, ngược lại đầu base branch (remote → HEAD). */
  private async parent({ cwd, branch, baseBranch, remote }: CommitToBranchInput): Promise<{ parent: string; branchExists: boolean }> {
    if (remote) {
      const fromRemote = await this.fetch(cwd, remote, branch);
      if (fromRemote) return { parent: fromRemote, branchExists: true };
    }
    const local = await this.git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}^{commit}`], { cwd });
    if (local.exitCode === 0) return { parent: local.stdout.trim(), branchExists: true };
    if (remote) {
      const base = await this.fetch(cwd, remote, baseBranch);
      if (base) return { parent: base, branchExists: false };
    }
    const head = await this.git(["rev-parse", "HEAD"], { cwd });
    if (head.exitCode !== 0) throw gitFailure("rev-parse", head);
    return { parent: head.stdout.trim(), branchExists: false };
  }

  /** Fetch một branch về refs/remotes/origin/<b>; branch không có trên remote → undefined. */
  private async fetch(cwd: string, remote: { url: string; env: Record<string, string> }, b: string): Promise<string | undefined> {
    const tracking = `refs/remotes/origin/${b}`;
    const r = await this.git(["fetch", "--quiet", "--", remote.url, `+refs/heads/${b}:${tracking}`], { cwd, env: remote.env, timeout: 300_000 });
    if (r.exitCode !== 0) {
      if (/couldn't find remote ref/i.test(r.stderr)) return undefined;
      throw gitFailure("fetch", r);
    }
    const sha = await this.git(["rev-parse", tracking], { cwd });
    return sha.exitCode === 0 ? sha.stdout.trim() : undefined;
  }
}
