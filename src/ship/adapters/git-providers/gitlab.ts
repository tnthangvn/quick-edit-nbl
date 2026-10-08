import "server-only";
import { requestJson } from "./http";
import type { GitBranch, GitProviderClient, GitPullRequest, GitRepo, NewPullRequest } from "./types";

type GlProject = {
  path_with_namespace: string;
  default_branch?: string | null;
  visibility?: string;
  http_url_to_repo: string;
  ssh_url_to_repo?: string;
  web_url: string;
};
type GlMr = { iid: number; web_url: string };

/** GitLab.com hoặc self-hosted (https://<host>/api/v4). Project id = "group/sub/repo" đã encode. */
export class GitLabClient implements GitProviderClient {
  private readonly base: string;

  constructor(
    host: string,
    private readonly token: string,
  ) {
    this.base = `https://${host}/api/v4`;
  }

  private headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  private get<T>(p: string) {
    return requestJson<T>(`${this.base}${p}`, { headers: this.headers() });
  }

  private project(repo: string) {
    return `/projects/${encodeURIComponent(repo)}`;
  }

  async whoami() {
    const { data } = await this.get<{ username: string }>("/user");
    let scopes: string[] = [];
    try {
      const { data: token } = await this.get<{ scopes?: string[] }>("/personal_access_tokens/self");
      scopes = token.scopes ?? [];
    } catch {
      // Token OAuth (glab) không đọc được /personal_access_tokens/self: bỏ qua phạm vi.
    }
    return { login: data.username, scopes };
  }

  async listRepos(q?: string): Promise<GitRepo[]> {
    const qs = new URLSearchParams({ membership: "true", per_page: "100", order_by: "last_activity_at", simple: "true" });
    if (q) qs.set("search", q.includes("/") ? q.split("/").pop()! : q);
    const { data } = await this.get<GlProject[]>(`/projects?${qs}`);
    return data
      .filter((p) => !q || p.path_with_namespace.toLowerCase().includes(q.toLowerCase()))
      .map((p) => ({
        fullName: p.path_with_namespace,
        defaultBranch: p.default_branch ?? null,
        private: p.visibility !== "public",
        cloneUrl: p.http_url_to_repo,
        sshUrl: p.ssh_url_to_repo ?? null,
        webUrl: p.web_url,
      }));
  }

  async listBranches(repo: string): Promise<GitBranch[]> {
    const { data } = await this.get<{ name: string; default: boolean }[]>(`${this.project(repo)}/repository/branches?per_page=100`);
    return data.map((b) => ({ name: b.name, isDefault: b.default }));
  }

  async findOpenPullRequest(repo: string, head: string, base: string): Promise<GitPullRequest | undefined> {
    const qs = new URLSearchParams({ state: "opened", source_branch: head, target_branch: base });
    const { data } = await this.get<GlMr[]>(`${this.project(repo)}/merge_requests?${qs}`);
    return data[0] ? { number: data[0].iid, url: data[0].web_url } : undefined;
  }

  async createPullRequest(input: NewPullRequest): Promise<GitPullRequest> {
    const { data } = await requestJson<GlMr>(`${this.base}${this.project(input.repo)}/merge_requests`, {
      method: "POST",
      headers: this.headers(),
      body: { source_branch: input.head, target_branch: input.base, title: input.title, description: input.body },
    });
    return { number: data.iid, url: data.web_url };
  }
}
