import "server-only";
import type { PublishMode } from "@/ship/contracts/enums/sync";
import { SubAction } from "@/ship/parents/SubAction";
import { CreatePullRequestTask } from "../../Connector/Tasks/CreatePullRequestTask";
import { ResolveGitCredentialsTask } from "../../Connector/Tasks/ResolveGitCredentialsTask";
import type { GitStorageConfig } from "../../Setting/Models/WorkspaceConfig";
import { CommitFilesTask } from "../Tasks/CommitFilesTask";
import { CommitToBranchTask } from "../Tasks/CommitToBranchTask";
import { PushGitTask } from "../Tasks/PushGitTask";

export type PublishGitChangesInput = {
  workspacePath: string;
  git: GitStorageConfig;
  /** Đường dẫn tuyệt đối các file cần đưa lên (file đã xoá → commit việc xoá). */
  files: string[];
  /** {action} trong mẫu commit message: add / update / delete. */
  action: string;
  /** {filename} trong mẫu commit message và tên branch PR. */
  filename: string;
  /** false = chỉ commit local (autoPush tắt). */
  push: boolean;
  /** Chi tiết bước đang chạy (Sync Activity). */
  onProgress?: (detail: string) => void;
};
export type PublishGitChangesOutput = {
  mode: PublishMode;
  branch: string;
  /** Commit mới nhất trên branch (null nếu không có gì để commit trên branch PR chưa tồn tại). */
  sha: string | null;
  committed: boolean;
  pushed: boolean;
  pullRequest: { number: number; url: string; created: boolean } | null;
};

const today = () => new Date().toISOString().slice(0, 10);
/** "Sidebar Menu.md" → "sidebar-menu" (an toàn cho tên branch). */
const slug = (filename: string) =>
  filename
    .replace(/\.md$/i, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "") || "spec";

export const renderCommitMessage = (template: string, action: string, filename: string) =>
  (template || "docs(spec): {action} {filename}").replaceAll("{action}", action).replaceAll("{filename}", filename);

export const renderPrBranch = (template: string, filename: string) =>
  (template || "spec/{date}-{filename}").replaceAll("{date}", today()).replaceAll("{filename}", slug(filename));

/**
 * Đưa thay đổi spec lên Git theo publishMode (spec 6.4):
 *  - PUSH: commit thẳng lên branch đang checkout → (push) git push <remote> HEAD:<branch>.
 *  - PULL_REQUEST: commit lên branch spec/{date}-{filename} (không đổi working tree) → (push) push branch →
 *    tạo PR hoặc dùng lại PR đang mở cho cùng branch (gộp nhiều lần Approve trong ngày vào một PR).
 * Dùng chung cho pipeline sau Approve (Publish) và nút Push trên Header (Storage).
 */
export class PublishGitChangesSubAction extends SubAction<PublishGitChangesInput, PublishGitChangesOutput> {
  constructor(
    private readonly commitFiles = new CommitFilesTask(),
    private readonly commitToBranch = new CommitToBranchTask(),
    private readonly pushGit = new PushGitTask(),
    private readonly resolveCredentials = new ResolveGitCredentialsTask(),
    private readonly createPullRequest = new CreatePullRequestTask(),
  ) {
    super();
  }

  async run(input: PublishGitChangesInput): Promise<PublishGitChangesOutput> {
    return input.git.publishMode === "PULL_REQUEST" ? this.viaPullRequest(input) : this.viaPush(input);
  }

  private async credentials(git: GitStorageConfig) {
    return this.resolveCredentials.run({ connectorId: git.connectorId, remote: git.remote });
  }

  private async viaPush({ workspacePath, git, files, action, filename, push, onProgress }: PublishGitChangesInput): Promise<PublishGitChangesOutput> {
    const message = renderCommitMessage(git.commitMessage, action, filename);
    onProgress?.(`commit “${message}”`);
    const { committed, sha } = await this.commitFiles.run({ cwd: workspacePath, paths: files, message });
    if (!push) return { mode: "PUSH", branch: git.branch, sha, committed, pushed: false, pullRequest: null };

    onProgress?.(`git push origin ${git.branch}…`);
    const creds = await this.credentials(git);
    await this.pushGit.run({ cwd: workspacePath, remoteUrl: creds.remoteUrl, env: creds.env, source: sha, branch: git.branch, trackOrigin: true });
    return { mode: "PUSH", branch: git.branch, sha, committed, pushed: true, pullRequest: null };
  }

  private async viaPullRequest({ workspacePath, git, files, action, filename, push, onProgress }: PublishGitChangesInput): Promise<PublishGitChangesOutput> {
    const branch = renderPrBranch(git.prBranchTemplate, filename);
    const message = renderCommitMessage(git.commitMessage, action, filename);
    const creds = push ? await this.credentials(git) : undefined;

    onProgress?.(`commit “${message}” → ${branch}`);
    const { committed, sha } = await this.commitToBranch.run({
      cwd: workspacePath,
      branch,
      baseBranch: git.branch,
      files,
      message,
      remote: creds && { url: creds.remoteUrl, env: creds.env },
    });
    if (!push || !creds || !sha) return { mode: "PULL_REQUEST", branch, sha, committed, pushed: false, pullRequest: null };

    onProgress?.(`push ${branch}…`);
    await this.pushGit.run({ cwd: workspacePath, remoteUrl: creds.remoteUrl, env: creds.env, source: sha, branch, trackOrigin: true });

    onProgress?.("tạo pull request…");
    const pr = await this.createPullRequest.run({
      connectorId: git.connectorId,
      repo: git.repo ?? git.remote,
      head: branch,
      base: git.branch,
      title: message,
      body: `Cập nhật spec từ Spec Studio: ${filename}`,
    });
    return { mode: "PULL_REQUEST", branch, sha, committed, pushed: true, pullRequest: pr };
  }
}
