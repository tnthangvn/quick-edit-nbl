import "server-only";
import { matchesQuery, requestJson } from "./http";
import type { GitBranch, GitProviderClient, GitPullRequest, GitRepo, NewPullRequest } from "./types";

type BbLink = { href: string; name?: string };
type BbRepo = { full_name: string; is_private: boolean; mainbranch?: { name: string } | null; links: { html: BbLink; clone?: BbLink[] } };
type BbPull = { id: number; links: { html: BbLink } };
type BbPage<T> = { values: T[] };

/**
 * Bitbucket Cloud (api.bitbucket.org/2.0). Token dạng "username:app_password" → Basic,
 * còn lại (repository/workspace access token) → Bearer.
 */
export class BitbucketClient implements GitProviderClient {
  private readonly base = "https://api.bitbucket.org/2.0";

  constructor(private readonly token: string) {}

  private headers() {
    return {
      Authorization: this.token.includes(":") ? `Basic ${Buffer.from(this.token).toString("base64")}` : `Bearer ${this.token}`,
    };
  }

  private get<T>(p: string) {
    return requestJson<T>(`${this.base}${p}`, { headers: this.headers() });
  }

  async whoami() {
    const { data, headers } = await this.get<{ username?: string; nickname?: string }>("/user");
    const scopes = (headers.get("x-oauth-scopes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return { login: data.username ?? data.nickname ?? "", scopes };
  }

  async listRepos(q?: string): Promise<GitRepo[]> {
    const { data } = await this.get<BbPage<BbRepo>>("/repositories?role=member&pagelen=100&sort=-updated_on");
    return data.values
      .filter((r) => matchesQuery(r.full_name, q))
      .map((r) => ({
        fullName: r.full_name,
        defaultBranch: r.mainbranch?.name ?? null,
        private: r.is_private,
        cloneUrl: r.links.clone?.find((l) => l.name === "https")?.href ?? `https://bitbucket.org/${r.full_name}.git`,
        sshUrl: r.links.clone?.find((l) => l.name === "ssh")?.href ?? null,
        webUrl: r.links.html.href,
      }));
  }

  async listBranches(repo: string): Promise<GitBranch[]> {
    const [{ data: info }, { data: page }] = await Promise.all([
      this.get<BbRepo>(`/repositories/${repo}`),
      this.get<BbPage<{ name: string }>>(`/repositories/${repo}/refs/branches?pagelen=100`),
    ]);
    return page.values.map((b) => ({ name: b.name, isDefault: b.name === info.mainbranch?.name }));
  }

  async findOpenPullRequest(repo: string, head: string, base: string): Promise<GitPullRequest | undefined> {
    const q = `source.branch.name="${head.replaceAll('"', "")}" AND destination.branch.name="${base.replaceAll('"', "")}"`;
    const { data } = await this.get<BbPage<BbPull>>(`/repositories/${repo}/pullrequests?state=OPEN&q=${encodeURIComponent(q)}`);
    const pr = data.values[0];
    return pr ? { number: pr.id, url: pr.links.html.href } : undefined;
  }

  async createPullRequest(input: NewPullRequest): Promise<GitPullRequest> {
    const { data } = await requestJson<BbPull>(`${this.base}/repositories/${input.repo}/pullrequests`, {
      method: "POST",
      headers: this.headers(),
      body: {
        title: input.title,
        description: input.body,
        source: { branch: { name: input.head } },
        destination: { branch: { name: input.base } },
      },
    });
    return { number: data.id, url: data.links.html.href };
  }
}
