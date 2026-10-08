import "server-only";
import { matchesQuery, requestJson } from "./http";
import type { GitBranch, GitProviderClient, GitPullRequest, GitRepo, NewPullRequest } from "./types";

type GhRepo = { full_name: string; default_branch?: string; private: boolean; clone_url: string; ssh_url?: string; html_url: string };
type GhPull = { number: number; html_url: string };

/** GitHub.com (api.github.com) hoặc GitHub Enterprise (https://<host>/api/v3). */
export class GitHubClient implements GitProviderClient {
  private readonly base: string;

  constructor(
    host: string,
    private readonly token: string,
  ) {
    this.base = host === "github.com" ? "https://api.github.com" : `https://${host}/api/v3`;
  }

  private get<T>(p: string) {
    return requestJson<T>(`${this.base}${p}`, { headers: this.headers() });
  }

  private headers() {
    return { Authorization: `Bearer ${this.token}`, "X-GitHub-Api-Version": "2022-11-28" };
  }

  async whoami() {
    const { data, headers } = await this.get<{ login: string }>("/user");
    const scopes = (headers.get("x-oauth-scopes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return { login: data.login, scopes };
  }

  async listRepos(q?: string): Promise<GitRepo[]> {
    const { data } = await this.get<GhRepo[]>("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member");
    return data
      .filter((r) => matchesQuery(r.full_name, q))
      .map((r) => ({ fullName: r.full_name, defaultBranch: r.default_branch ?? null, private: r.private, cloneUrl: r.clone_url, sshUrl: r.ssh_url ?? null, webUrl: r.html_url }));
  }

  async listBranches(repo: string): Promise<GitBranch[]> {
    const [{ data: info }, { data: branches }] = await Promise.all([
      this.get<GhRepo>(`/repos/${repo}`),
      this.get<{ name: string }[]>(`/repos/${repo}/branches?per_page=100`),
    ]);
    return branches.map((b) => ({ name: b.name, isDefault: b.name === info.default_branch }));
  }

  async findOpenPullRequest(repo: string, head: string, base: string): Promise<GitPullRequest | undefined> {
    const owner = repo.split("/")[0];
    const qs = new URLSearchParams({ state: "open", head: `${owner}:${head}`, base });
    const { data } = await this.get<GhPull[]>(`/repos/${repo}/pulls?${qs}`);
    return data[0] ? { number: data[0].number, url: data[0].html_url } : undefined;
  }

  async createPullRequest(input: NewPullRequest): Promise<GitPullRequest> {
    const { data } = await requestJson<GhPull>(`${this.base}/repos/${input.repo}/pulls`, {
      method: "POST",
      headers: this.headers(),
      body: { title: input.title, body: input.body, head: input.head, base: input.base },
    });
    return { number: data.number, url: data.html_url };
  }
}
