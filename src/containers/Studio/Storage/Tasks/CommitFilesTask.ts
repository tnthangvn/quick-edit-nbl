import "server-only";
import { runGit, type GitRunner } from "@/ship/adapters/git";
import { Task } from "@/ship/parents/Task";
import { gitFailure } from "../Exceptions/mapFailures";

export type CommitFilesInput = {
  /** Thư mục trong working tree (workspace.path). */
  cwd: string;
  /** Pathspec (tuyệt đối hoặc tương đối với cwd): file hoặc thư mục spec. */
  paths: string[];
  message: string;
};
export type CommitFilesOutput = { committed: boolean; sha: string };

/**
 * Commit thẳng lên branch đang checkout, CHỈ các path đã cho (git commit -- <paths>): thay đổi khác mà người dùng
 * đã stage giữ nguyên. Không có gì thay đổi → committed = false, sha = HEAD hiện tại.
 */
export class CommitFilesTask extends Task<CommitFilesInput, CommitFilesOutput> {
  constructor(private readonly git: GitRunner = runGit) {
    super();
  }

  async run({ cwd, paths, message }: CommitFilesInput): Promise<CommitFilesOutput> {
    const add = await this.git(["add", "-A", "--", ...paths], { cwd });
    if (add.exitCode !== 0) throw gitFailure("add", add);

    const diff = await this.git(["diff", "--cached", "--quiet", "--", ...paths], { cwd });
    if (diff.exitCode > 1) throw gitFailure("diff", diff);
    if (diff.exitCode === 0) return { committed: false, sha: await this.head(cwd) };

    const commit = await this.git(["commit", "--quiet", "-m", message, "--", ...paths], { cwd });
    if (commit.exitCode !== 0) throw gitFailure("commit", commit);
    return { committed: true, sha: await this.head(cwd) };
  }

  private async head(cwd: string): Promise<string> {
    const r = await this.git(["rev-parse", "HEAD"], { cwd });
    if (r.exitCode !== 0) throw gitFailure("rev-parse", r);
    return r.stdout.trim();
  }
}
