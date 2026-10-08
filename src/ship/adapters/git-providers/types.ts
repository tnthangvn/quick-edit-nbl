import "server-only";

/** Provider REST hỗ trợ (khớp enum GitProvider trừ GENERIC). */
export type RestGitProvider = "GITHUB" | "GITLAB" | "BITBUCKET" | "GITEA";

export type GitAccount = { login: string; scopes: string[] };
export type GitRepo = { fullName: string; defaultBranch: string | null; private: boolean; cloneUrl: string; sshUrl: string | null; webUrl: string };
export type GitBranch = { name: string; isDefault: boolean };
export type GitPullRequest = { number: number; url: string };
export type NewPullRequest = { repo: string; head: string; base: string; title: string; body: string };

/** Client REST của một Git provider, xác thực bằng token (PAT / token tạm lấy từ CLI). */
export interface GitProviderClient {
  whoami(): Promise<GitAccount>;
  /** Repo người dùng là thành viên, lọc theo q (tên / owner/repo). */
  listRepos(q?: string): Promise<GitRepo[]>;
  listBranches(repo: string): Promise<GitBranch[]>;
  findOpenPullRequest(repo: string, head: string, base: string): Promise<GitPullRequest | undefined>;
  createPullRequest(input: NewPullRequest): Promise<GitPullRequest>;
}

/** Provider trả HTTP lỗi. Không chứa body (có thể lộ dữ liệu), chỉ status. */
export class GitProviderHttpError extends Error {
  constructor(readonly status: number) {
    super(`git provider HTTP ${status}`);
    this.name = "GitProviderHttpError";
  }
}
