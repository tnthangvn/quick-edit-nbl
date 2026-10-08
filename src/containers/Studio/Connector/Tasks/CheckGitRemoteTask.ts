import "server-only";
import { run as defaultRun } from "@/ship/adapters/process";
import { Task } from "@/ship/parents/Task";

export type CheckGitRemoteTaskInput = { remoteUrl: string; branch: string; env: Record<string, string> };
export type CheckGitRemoteTaskOutput = { reachable: boolean; branchFound: boolean; headSha: string | null; exitCode: number };

/** `git ls-remote --heads <remote> <branch>` (nút Kiểm tra Git). Không qua shell; "--" chặn remote bị hiểu là tham số. */
export class CheckGitRemoteTask extends Task<CheckGitRemoteTaskInput, CheckGitRemoteTaskOutput> {
  constructor(private readonly exec: typeof defaultRun = defaultRun) {
    super();
  }

  async run({ remoteUrl, branch, env }: CheckGitRemoteTaskInput): Promise<CheckGitRemoteTaskOutput> {
    const r = await this.exec("git", ["ls-remote", "--heads", "--", remoteUrl, `refs/heads/${branch}`], { env, timeout: 30_000 });
    if (r.exitCode !== 0) return { reachable: false, branchFound: false, headSha: null, exitCode: r.exitCode };
    const sha = r.stdout.split(/\s+/)[0] || null;
    return { reachable: true, branchFound: !!sha, headSha: sha, exitCode: 0 };
  }
}
