import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { gitErrorDetail, runGit, stripUrlCredentials, type GitRunner } from "@/ship/adapters/git";
import { Task } from "@/ship/parents/Task";
import { CloneFailedException } from "../Exceptions/CloneFailedException";

/**
 * git clone --branch <branch> <remote> <targetPath> (luồng 6.3). `branch` chưa có trên remote → clone branch mặc định
 * của repo rồi tạo + push `branch` mới từ đó (coi như "dùng tên này làm nhánh mới").
 * Nếu remoteUrl có kèm token (từ ResolveGitCredentialsTask) thì sau khi clone đặt lại origin về URL không token,
 * để token không nằm trong .git/config.
 */
export type CloneRepositoryTaskInput = { remoteUrl: string; branch: string; targetPath: string; env: Record<string, string> };
export type CloneRepositoryTaskOutput = { headSha: string };

/** `git ls-remote --exit-code`: 0 = có ref, 2 = không có ref nào khớp (repo/remote vẫn truy cập được bình thường). */
const EXIT_NO_MATCHING_REF = 2;

export class CloneRepositoryTask extends Task<CloneRepositoryTaskInput, CloneRepositoryTaskOutput> {
  constructor(private readonly git: GitRunner = runGit) {
    super();
  }

  async run({ remoteUrl, branch, targetPath, env }: CloneRepositoryTaskInput): Promise<CloneRepositoryTaskOutput> {
    const target = path.resolve(targetPath);
    await mkdir(path.dirname(target), { recursive: true });

    const lsRemote = await this.git(["ls-remote", "--exit-code", "--heads", "--", remoteUrl, branch], { env, timeout: 60_000 });
    if (lsRemote.exitCode !== 0 && lsRemote.exitCode !== EXIT_NO_MATCHING_REF) throw new CloneFailedException({ detail: gitErrorDetail(lsRemote) });
    const branchExists = lsRemote.exitCode === 0;

    const cloneArgs = branchExists ? ["clone", "--branch", branch, "--", remoteUrl, target] : ["clone", "--", remoteUrl, target];
    const clone = await this.git(cloneArgs, { env, timeout: 600_000 });
    if (clone.exitCode !== 0) throw new CloneFailedException({ detail: gitErrorDetail(clone) });

    if (!branchExists) {
      const checkout = await this.git(["checkout", "-b", branch], { cwd: target, env });
      if (checkout.exitCode !== 0) throw new CloneFailedException({ detail: gitErrorDetail(checkout) });
      const push = await this.git(["push", "-u", "origin", branch], { cwd: target, env });
      if (push.exitCode !== 0) throw new CloneFailedException({ detail: gitErrorDetail(push) });
    }

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
