import "server-only";
import { matchesQuery, requestJson } from "./http";
import type { GitBranch, GitProviderClient, GitPullRequest, GitRepo, NewPullRequest } from "./types";

type GtRepo = { full_name: string; default_branch?: string; private: boolean; clone_url: string; ssh_url?: string; html_url: string };
type GtPull = { number: number; html_url: string; head: { ref: string }; base: { ref: string } };

/** Gitea / Forgejo (https://<host>/api/v1). */
export class GiteaClient implements GitProviderClient {
  private readonly base: string;

  constructor(
    host: string,
    private readonly token: string,
  ) {
    this.base = `https://${host}/api/v1`;
  }

  private headers() {
    return { Authorization: `token ${this.token}` };
  }

  private get<T>(p: string) {
    return requestJson<T>(`${this.base}${p}`, { headers: this.headers() });
  }

  async whoami() {
    const { data } = await this.get<{ login: string }>("/user");
    return { login: data.login, scopes: [] };
  }

  async listRepos(q?: string): Promise<GitRepo[]> {
    const { data } = await this.get<GtRepo[]>("/user/repos?limit=50");
    return data
      .filter((r) => matchesQuery(r.full_name, q))
      .map((r) => ({ fullName: r.full_name, defaultBranch: r.default_branch ?? null, private: r.private, cloneUrl: r.clone_url, sshUrl: r.ssh_url ?? null, webUrl: r.html_url }));
  }

  async listBranches(repo: string): Promise<GitBranch[]> {
    const [{ data: info }, { data: branches }] = await Promise.all([
      this.get<GtRepo>(`/repos/${repo}`),
      this.get<{ name: string }[]>(`/repos/${repo}/branches?limit=50`),
    ]);
    return branches.map((b) => ({ name: b.name, isDefault: b.name === info.default_branch }));
  }

  async findOpenPullRequest(repo: string, head: string, base: string): Promise<GitPullRequest | undefined> {
    const { data } = await this.get<GtPull[]>(`/repos/${repo}/pulls?state=open&limit=50`);
    const pr = data.find((p) => p.head.ref === head && p.base.ref === base);
    return pr ? { number: pr.number, url: pr.html_url } : undefined;
  }

  async createPullRequest(input: NewPullRequest): Promise<GitPullRequest> {
    const { data } = await requestJson<GtPull>(`${this.base}/repos/${input.repo}/pulls`, {
      method: "POST",
      headers: this.headers(),
      body: { head: input.head, base: input.base, title: input.title, body: input.body },
    });
    return { number: data.number, url: data.html_url };
  }
}
