import "server-only";
import { runGit, type GitRunner } from "@/ship/adapters/git";
import { Task } from "@/ship/parents/Task";
import { gitFailure } from "../Exceptions/mapFailures";

export type PushGitInput = {
  cwd: string;
  /** URL remote dùng được (có thể kèm token tạm từ ResolveGitCredentialsTask; không ghi vào config, không log). */
  remoteUrl: string;
  env: Record<string, string>;
  /** Commit cần đẩy (sha hoặc HEAD). */
  source: string;
  branch: string;
  /** Cập nhật refs/remotes/origin/<branch> sau khi push để đếm ahead/behind đúng. */
  trackOrigin: boolean;
};

/** git push <remoteUrl> <source>:refs/heads/<branch>. Bị từ chối → STORAGE.PUSH_REJECTED, sai xác thực → STORAGE.GIT_AUTH_FAILED. */
export class PushGitTask extends Task<PushGitInput, void> {
  constructor(private readonly git: GitRunner = runGit) {
    super();
  }

  async run({ cwd, remoteUrl, env, source, branch, trackOrigin }: PushGitInput): Promise<void> {
    const sha = await this.git(["rev-parse", "--verify", `${source}^{commit}`], { cwd });
    if (sha.exitCode !== 0) throw gitFailure("rev-parse", sha);
    const push = await this.git(["push", "--porcelain", "--", remoteUrl, `${sha.stdout.trim()}:refs/heads/${branch}`], { cwd, env, timeout: 300_000 });
    if (push.exitCode !== 0) throw gitFailure("push", push);
    if (trackOrigin) await this.git(["update-ref", `refs/remotes/origin/${branch}`, sha.stdout.trim()], { cwd });
  }
}
