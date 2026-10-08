import "server-only";
import {
  DEFAULT_GIT_HOSTS,
  gitBasicAuth,
  GitProviderHttpError,
  type GitBranch,
  type GitProviderClient,
  type GitPullRequest,
  type GitRepo,
  type NewPullRequest,
  type RestGitProvider,
} from "@/ship/adapters/git-providers";
import { McpToolError, type McpServerSpec, type McpToolInfo } from "@/ship/adapters/mcp";
import { AppException } from "@/ship/parents/AppException";
import type { ConnectorStatus } from "../Enums/ConnectorStatus";
import { ConnectorCliNotFoundException } from "../Exceptions/ConnectorCliNotFoundException";
import { ConnectorMcpUnreachableException } from "../Exceptions/ConnectorMcpUnreachableException";
import { ConnectorNeedsLoginException } from "../Exceptions/ConnectorNeedsLoginException";
import { ConnectorNotSupportedException } from "../Exceptions/ConnectorNotSupportedException";
import { ConnectorProviderErrorException } from "../Exceptions/ConnectorProviderErrorException";
import { ConnectorRepoNotFoundException } from "../Exceptions/ConnectorRepoNotFoundException";
import { ConnectorTokenMissingException } from "../Exceptions/ConnectorTokenMissingException";
import { connectorSecretRef, type ConnectorRow } from "../Models/Connector";
import { knownCliOf, parseAuthStatus } from "./cliTools";
import type { ConnectorDeps } from "./deps";
import { McpGitOperations } from "./McpGitOperations";

export type ConnectorCheckResult = {
  status: ConnectorStatus;
  account: string | null;
  host: string | null;
  scopes: string[];
  /** Lệnh gợi ý khi CLI chưa đăng nhập (gh auth login...). */
  loginCommand: string | null;
};

export type EnsuredPullRequest = GitPullRequest & { created: boolean };

const isRestProvider = (p: ConnectorRow["provider"]): p is RestGitProvider => p !== "GENERIC";

/**
 * Thao tác với Git provider qua một connector, ẩn khác biệt CLI / MCP / TOKEN / SSH.
 * - CLI: đọc trạng thái bằng `<cli> auth status`, lấy token tạm (`gh auth token`) chỉ trong bộ nhớ rồi gọi REST.
 * - MCP: gọi tool của server (search_repositories, list_branches, create_pull_request...).
 * - TOKEN: PAT trong secret store → REST.
 * - SSH: chỉ clone/pull/push; không liệt kê repo, không tạo PR.
 * Không bao giờ trả / log token.
 */
export class ConnectorGateway {
  constructor(
    private readonly connector: ConnectorRow,
    private readonly deps: ConnectorDeps,
  ) {}

  /** Host hiệu lực: host đã khai hoặc host mặc định của provider. */
  get host(): string | null {
    return this.connector.host ?? (isRestProvider(this.connector.provider) ? (DEFAULT_GIT_HOSTS[this.connector.provider] ?? null) : null);
  }

  // ---------- Kiểm tra ----------

  async check(): Promise<ConnectorCheckResult> {
    const base = { host: this.host, scopes: [] as string[], account: null, loginCommand: null };
    switch (this.connector.type) {
      case "CLI":
        return this.checkCli();
      case "TOKEN": {
        if (!this.connector.has_token || !(await this.token())) return { ...base, status: "NEEDS_LOGIN" };
        try {
          const me = await (await this.restClient()).whoami();
          return { ...base, status: "CONNECTED", account: me.login, scopes: me.scopes };
        } catch (err) {
          return { ...base, status: err instanceof GitProviderHttpError && (err.status === 401 || err.status === 403) ? "NEEDS_LOGIN" : "ERROR" };
        }
      }
      case "MCP":
        try {
          const ops = await this.mcpOps();
          return { ...base, status: "CONNECTED", account: await ops.whoami() };
        } catch {
          return { ...base, status: "ERROR" };
        }
      case "SSH":
        return this.checkSsh();
    }
  }

  private async checkCli(): Promise<ConnectorCheckResult> {
    const command = this.connector.command ?? "";
    const host = this.host ?? "";
    const known = knownCliOf(command);
    const loginCommand = known?.loginCommand(host) ?? null;
    const base = { host: this.host, scopes: [] as string[], account: null, loginCommand };
    if (!(await this.deps.process.which(command))) return { ...base, status: "CLI_NOT_FOUND" };
    if (!known) return { ...base, status: "CONNECTED" };
    const r = await this.deps.process.run(command, known.statusArgs(host), { timeout: 15_000 });
    if (r.exitCode !== 0) return { ...base, status: r.timedOut ? "ERROR" : "NEEDS_LOGIN" };
    if (known.binary === "tea" && !r.stdout.trim()) return { ...base, status: "NEEDS_LOGIN" };
    const { account, scopes } = parseAuthStatus(`${r.stdout}\n${r.stderr}`);
    return { ...base, status: "CONNECTED", account, scopes };
  }

  private async checkSsh(): Promise<ConnectorCheckResult> {
    const base = { host: this.host, scopes: [] as string[], account: null, loginCommand: null };
    if (!(await this.deps.process.which("ssh"))) return { ...base, status: "CLI_NOT_FOUND" };
    if (!this.host) return { ...base, status: "CONNECTED" };
    // GitHub/GitLab/Bitbucket trả lời "Hi <user>!" / "Welcome to GitLab, @<user>!" rồi đóng (exit 1 vẫn là thành công).
    const r = await this.deps.process.run("ssh", ["-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", `git@${this.host.split(":")[0]}`], {
      timeout: 20_000,
    });
    const out = `${r.stdout}\n${r.stderr}`;
    const account = /Hi ([\w.-]+)!|Welcome to GitLab, @([\w.-]+)!|logged in as ([\w.-]+)/i.exec(out);
    if (account) return { ...base, status: "CONNECTED", account: account[1] ?? account[2] ?? account[3] ?? null };
    if (/Permission denied/i.test(out)) return { ...base, status: "NEEDS_LOGIN" };
    return { ...base, status: r.exitCode === 0 ? "CONNECTED" : "ERROR" };
  }

  // ---------- Repo / branch / PR ----------

  listRepos(q?: string): Promise<GitRepo[]> {
    return this.withProvider(
      (rest) => rest.listRepos(q),
      (mcp) => mcp.listRepos(q),
    );
  }

  listBranches(repo: string): Promise<GitBranch[]> {
    return this.withProvider(
      (rest) => rest.listBranches(repo),
      (mcp) => mcp.listBranches(repo),
    );
  }

  /** Dùng lại PR/MR đang mở cho cùng head → base; chưa có thì tạo mới. */
  ensurePullRequest(input: NewPullRequest): Promise<EnsuredPullRequest> {
    const ensure = async (find: () => Promise<GitPullRequest | undefined>, create: () => Promise<GitPullRequest>) => {
      const existing = await find();
      return existing ? { ...existing, created: false } : { ...(await create()), created: true };
    };
    return this.withProvider(
      (rest) => ensure(() => rest.findOpenPullRequest(input.repo, input.head, input.base), () => rest.createPullRequest(input)),
      (mcp) => ensure(() => mcp.findOpenPullRequest(input.repo, input.head, input.base), () => mcp.createPullRequest(input)),
    );
  }

  async listTools(): Promise<McpToolInfo[]> {
    if (this.connector.type !== "MCP") throw new ConnectorNotSupportedException({ type: this.connector.type, operation: "tools" });
    try {
      return await this.deps.mcp.listTools(await this.mcpSpec());
    } catch (err) {
      throw new ConnectorMcpUnreachableException(undefined, { cause: err });
    }
  }

  /**
   * Header Authorization cho git qua HTTPS (CLI: token tạm, TOKEN: PAT). MCP / SSH / CLI không lấy được token → undefined
   * (git dùng ssh-agent / credential helper sẵn có của máy).
   */
  async gitAuthorization(): Promise<string | undefined> {
    const { type, provider } = this.connector;
    if ((type !== "CLI" && type !== "TOKEN") || !isRestProvider(provider)) return undefined;
    if (type === "CLI" && !knownCliOf(this.connector.command ?? "")?.tokenArgs) return undefined;
    const token = await this.token();
    return token ? gitBasicAuth(provider, token) : undefined;
  }

  // ---------- nội bộ ----------

  private async withProvider<T>(viaRest: (c: GitProviderClient) => Promise<T>, viaMcp: (ops: McpGitOperations) => Promise<T>): Promise<T> {
    try {
      if (this.connector.type === "MCP") return await viaMcp(await this.mcpOps());
      if (this.connector.type === "SSH") throw new ConnectorNotSupportedException({ type: "SSH", operation: "provider-api" });
      return await viaRest(await this.restClient());
    } catch (err) {
      throw this.mapError(err);
    }
  }

  private async restClient(): Promise<GitProviderClient> {
    const { provider, type } = this.connector;
    if (!isRestProvider(provider) || !this.host) throw new ConnectorNotSupportedException({ type, operation: "provider-api" });
    const token = await this.token();
    if (!token) {
      if (type === "TOKEN") throw new ConnectorTokenMissingException();
      throw new ConnectorNeedsLoginException({ loginCommand: knownCliOf(this.connector.command ?? "")?.loginCommand(this.host) ?? "" });
    }
    return this.deps.restClient(provider, this.host, token);
  }

  /** Token dùng cho REST: PAT trong secret store (TOKEN) hoặc token tạm từ CLI (không lưu lại). */
  private async token(): Promise<string | undefined> {
    if (this.connector.type === "TOKEN") return this.deps.secrets.get(connectorSecretRef(this.connector.id));
    if (this.connector.type !== "CLI") return undefined;
    const command = this.connector.command ?? "";
    const known = knownCliOf(command);
    if (!known?.tokenArgs) throw new ConnectorNotSupportedException({ type: "CLI", operation: "token" });
    if (!(await this.deps.process.which(command))) throw new ConnectorCliNotFoundException({ command });
    const r = await this.deps.process.run(command, known.tokenArgs(this.host ?? ""), { timeout: 15_000 });
    const token = r.stdout.trim();
    return r.exitCode === 0 && token && !/\s/.test(token) ? token : undefined;
  }

  private async mcpSpec(): Promise<McpServerSpec> {
    const c = this.connector;
    const secretValues: Record<string, string> = {};
    for (const key of c.secret_keys) {
      const value = await this.deps.secrets.get(connectorSecretRef(c.id, key));
      if (value !== undefined) secretValues[key] = value;
    }
    if (c.transport === "HTTP") return { transport: "HTTP", url: c.url ?? "", headers: { ...c.headers, ...secretValues } };
    return { transport: "STDIO", command: c.command ?? "", args: c.args, env: { ...c.env, ...secretValues } };
  }

  private async mcpOps(): Promise<McpGitOperations> {
    const spec = await this.mcpSpec();
    return new McpGitOperations(this.connector.provider, (fn) => this.deps.mcp.withClient(spec, fn), this.deps.mcp.call);
  }

  private mapError(err: unknown): unknown {
    if (err instanceof AppException) return err;
    if (err instanceof GitProviderHttpError) {
      if (err.status === 401 || err.status === 403) return new ConnectorNeedsLoginException({ loginCommand: "" }, { cause: err });
      if (err.status === 404) return new ConnectorRepoNotFoundException(undefined, { cause: err });
      return new ConnectorProviderErrorException({ status: err.status }, { cause: err });
    }
    if (err instanceof McpToolError) return new ConnectorProviderErrorException({ tool: err.tool }, { cause: err });
    if (this.connector.type === "MCP") return new ConnectorMcpUnreachableException(undefined, { cause: err });
    return new ConnectorProviderErrorException({ status: 0 }, { cause: err });
  }
}
