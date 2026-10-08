import "server-only";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { GitBranch, GitPullRequest, GitRepo, NewPullRequest } from "@/ship/adapters/git-providers";
import type { callMcpTool } from "@/ship/adapters/mcp";
import type { GitProvider } from "@/ship/contracts/enums/sync";
import { ConnectorMcpToolMissingException } from "../Exceptions/ConnectorMcpToolMissingException";
import { ConnectorProviderErrorException } from "../Exceptions/ConnectorProviderErrorException";

type Obj = Record<string, unknown>;
type Session = <T>(fn: (client: Client) => Promise<T>) => Promise<T>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Kết quả tool thường là mảng hoặc object bọc mảng (items / values / data...). */
function asArray(v: unknown): Obj[] {
  if (Array.isArray(v)) return v.filter(isObj);
  if (isObj(v)) for (const key of ["items", "values", "data", "repositories", "branches", "pull_requests", "merge_requests"]) if (Array.isArray(v[key])) return asArray(v[key]);
  return [];
}

function str(o: Obj, ...keys: string[]): string | null {
  for (const k of keys) if (typeof o[k] === "string" && o[k]) return o[k] as string;
  return null;
}

function num(o: Obj, ...keys: string[]): number | null {
  for (const k of keys) if (typeof o[k] === "number") return o[k] as number;
  return null;
}

function toRepo(o: Obj): GitRepo | null {
  const fullName = str(o, "full_name", "fullName", "path_with_namespace", "nameWithOwner");
  if (!fullName) return null;
  const webUrl = str(o, "html_url", "web_url", "url") ?? "";
  return {
    fullName,
    defaultBranch: str(o, "default_branch", "defaultBranch"),
    private: o.private === true || o.visibility === "private" || o.visibility === "internal",
    cloneUrl: str(o, "clone_url", "http_url_to_repo", "cloneUrl") ?? (webUrl ? `${webUrl}.git` : ""),
    sshUrl: str(o, "ssh_url", "ssh_url_to_repo", "sshUrl"),
    webUrl,
  };
}

function toPullRequest(v: unknown): GitPullRequest | undefined {
  const o = isObj(v) ? v : undefined;
  if (!o) return undefined;
  const number = num(o, "number", "iid", "id");
  const url = str(o, "html_url", "web_url", "url");
  return number !== null && url ? { number, url } : undefined;
}

/**
 * Thao tác Git qua tool của MCP server. Tên tool theo GitHub MCP server (search_repositories, list_branches,
 * list_pull_requests, create_pull_request, get_me) và GitLab MCP server (create_merge_request, list_merge_requests...).
 * Server không có tool cần dùng → CONNECTOR.MCP_TOOL_MISSING.
 */
export class McpGitOperations {
  constructor(
    private readonly provider: GitProvider,
    private readonly session: Session,
    private readonly call: typeof callMcpTool,
  ) {}

  private get isGitLab() {
    return this.provider === "GITLAB";
  }

  private run<T>(fn: (call: (tool: string, args: Obj, optional?: boolean) => Promise<unknown>) => Promise<T>): Promise<T> {
    return this.session(async (client) => {
      const tools = new Set((await client.listTools()).tools.map((t) => t.name));
      return fn(async (tool, args, optional = false) => {
        if (!tools.has(tool)) {
          if (optional) return undefined;
          throw new ConnectorMcpToolMissingException({ tool });
        }
        return this.call(client, tool, args);
      });
    });
  }

  private split(repo: string) {
    const [owner, ...rest] = repo.split("/");
    return { owner, repo: rest.join("/") };
  }

  /** Tài khoản đang dùng (tool get_me nếu server có), không có thì null. */
  whoami(): Promise<string | null> {
    return this.run(async (call) => {
      const me = await call("get_me", {}, true);
      return isObj(me) ? str(me, "login", "username") : null;
    });
  }

  listRepos(q?: string): Promise<GitRepo[]> {
    return this.run(async (call) => {
      let query = q?.trim() ?? "";
      if (!this.isGitLab) {
        const login = !query ? await call("get_me", {}, true) : undefined;
        query = query ? `${query} in:name` : isObj(login) && str(login, "login") ? `user:${str(login, "login")}` : "";
        if (!query) return [];
      }
      const result = await call("search_repositories", this.isGitLab ? { search: query } : { query, perPage: 50 });
      return asArray(result)
        .map(toRepo)
        .filter((r): r is GitRepo => r !== null);
    });
  }

  listBranches(repo: string): Promise<GitBranch[]> {
    return this.run(async (call) => {
      const args = this.isGitLab ? { project_id: repo } : this.split(repo);
      return asArray(await call("list_branches", args))
        .map((b) => str(b, "name"))
        .filter((n): n is string => n !== null)
        .map((name) => ({ name, isDefault: false }));
    });
  }

  findOpenPullRequest(repo: string, head: string, base: string): Promise<GitPullRequest | undefined> {
    return this.run(async (call) => {
      if (this.isGitLab) {
        const list = await call("list_merge_requests", { project_id: repo, state: "opened", source_branch: head, target_branch: base }, true);
        return toPullRequest(asArray(list)[0]);
      }
      const { owner, repo: name } = this.split(repo);
      const list = await call("list_pull_requests", { owner, repo: name, state: "open", head: `${owner}:${head}`, base }, true);
      return toPullRequest(asArray(list)[0]);
    });
  }

  createPullRequest(input: NewPullRequest): Promise<GitPullRequest> {
    return this.run(async (call) => {
      const result = this.isGitLab
        ? await call("create_merge_request", {
            project_id: input.repo,
            title: input.title,
            description: input.body,
            source_branch: input.head,
            target_branch: input.base,
          })
        : await call("create_pull_request", { ...this.split(input.repo), title: input.title, body: input.body, head: input.head, base: input.base });
      const pr = toPullRequest(result);
      if (!pr) throw new ConnectorProviderErrorException({ tool: this.isGitLab ? "create_merge_request" : "create_pull_request" });
      return pr;
    });
  }
}
