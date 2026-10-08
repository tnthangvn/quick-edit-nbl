import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { gitErrorDetail, runGit, stripUrlCredentials, type GitRunner } from "@/ship/adapters/git";
import { Task } from "@/ship/parents/Task";
import { CloneFailedException } from "../Exceptions/CloneFailedException";

/**
 * git clone --branch <branch> <remote> <targetPath> (luồng 6.3).
 * Nếu remoteUrl có kèm token (từ ResolveGitCredentialsTask) thì sau khi clone đặt lại origin về URL không token,
 * để token không nằm trong .git/config.
 */
export type CloneRepositoryTaskInput = { remoteUrl: string; branch: string; targetPath: string; env: Record<string, string> };
export type CloneRepositoryTaskOutput = { headSha: string };

export class CloneRepositoryTask extends Task<CloneRepositoryTaskInput, CloneRepositoryTaskOutput> {
  constructor(private readonly git: GitRunner = runGit) {
    super();
  }

  async run({ remoteUrl, branch, targetPath, env }: CloneRepositoryTaskInput): Promise<CloneRepositoryTaskOutput> {
    const target = path.resolve(targetPath);
    await mkdir(path.dirname(target), { recursive: true });
    const clone = await this.git(["clone", "--branch", branch, "--", remoteUrl, target], { env, timeout: 600_000 });
    if (clone.exitCode !== 0) throw new CloneFailedException({ detail: gitErrorDetail(clone) });

    const plain = stripUrlCredentials(remoteUrl);
    if (plain !== remoteUrl) {
      const reset = await this.git(["remote", "set-url", "origin", plain], { cwd: target });
      if (reset.exitCode !== 0) throw new CloneFailedException({ detail: gitErrorDetail(reset) });
    }
    const head = await this.git(["rev-parse", "HEAD"], { cwd: target });
    if (head.exitCode !== 0) throw new CloneFailedException({ detail: gitErrorDetail(head) });
    return { headSha: head.stdout.trim() };
  }
}
