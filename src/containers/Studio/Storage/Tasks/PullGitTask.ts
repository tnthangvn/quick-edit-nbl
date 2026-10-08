import "server-only";
import { gitErrorDetail, runGit, type GitRunner } from "@/ship/adapters/git";
import { Task } from "@/ship/parents/Task";
import { gitFailure } from "../Exceptions/mapFailures";
import { PullConflictException } from "../Exceptions/PullConflictException";

export type PullGitInput = { cwd: string; remoteUrl: string; env: Record<string, string>; branch: string };
export type PullGitOutput = { headSha: string; changedFiles: string[] };

/**
 * Tương đương `git pull --ff-only`: fetch branch về refs/remotes/origin/<branch> rồi merge --ff-only.
 * Lịch sử đã tách / thay đổi local bị ghi đè → STORAGE.PULL_CONFLICT (không tự merge).
 */
export class PullGitTask extends Task<PullGitInput, PullGitOutput> {
  constructor(private readonly git: GitRunner = runGit) {
    super();
  }

  async run({ cwd, remoteUrl, env, branch }: PullGitInput): Promise<PullGitOutput> {
    const before = await this.git(["rev-parse", "HEAD"], { cwd });
    if (before.exitCode !== 0) throw gitFailure("rev-parse", before);

    const tracking = `refs/remotes/origin/${branch}`;
    const fetch = await this.git(["fetch", "--quiet", "--", remoteUrl, `+refs/heads/${branch}:${tracking}`], { cwd, env, timeout: 300_000 });
    if (fetch.exitCode !== 0) throw gitFailure("fetch", fetch);

    const merge = await this.git(["merge", "--ff-only", "--quiet", tracking], { cwd });
    if (merge.exitCode !== 0) throw new PullConflictException({ detail: gitErrorDetail(merge) });

    const after = await this.git(["rev-parse", "HEAD"], { cwd });
    const headSha = after.stdout.trim();
    const diff = await this.git(["diff", "--name-only", "-z", before.stdout.trim(), headSha], { cwd });
    return { headSha, changedFiles: diff.stdout.split("\0").filter(Boolean) };
  }
}
