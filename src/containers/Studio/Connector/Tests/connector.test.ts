import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonDataDriver, setDataDriverForTesting } from "@/ship/adapters/data";
import type { GitProviderClient } from "@/ship/adapters/git-providers";
import type { RunResult } from "@/ship/adapters/process";
import { MemorySecrets } from "../../Setting/Tests/memorySecrets";
import { CreateConnectorAction, type CreateConnectorInput } from "../Actions/CreateConnectorAction";
import { DeleteConnectorAction } from "../Actions/DeleteConnectorAction";
import { ConnectorRepository } from "../Data/Repositories/ConnectorRepository";
import type { ConnectorDeps } from "../Gateways/deps";
import { CheckConnectorTask } from "../Tasks/CheckConnectorTask";
import { CreateConnectorTask } from "../Tasks/CreateConnectorTask";
import { CreatePullRequestTask } from "../Tasks/CreatePullRequestTask";
import { DeleteConnectorTask } from "../Tasks/DeleteConnectorTask";
import { DetectCliTask } from "../Tasks/DetectCliTask";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { ResolveGitCredentialsTask } from "../Tasks/ResolveGitCredentialsTask";
import { WriteConnectorSecretsTask } from "../Tasks/WriteConnectorSecretsTask";

const res = (exitCode: number, stdout = "", stderr = ""): RunResult => ({ exitCode, stdout, stderr, timedOut: false });

const base: CreateConnectorInput = {
  name: "c",
  type: "TOKEN",
  provider: "GITHUB",
  host: null,
  command: null,
  args: [],
  env: {},
  transport: null,
  url: null,
  headers: {},
  secrets: {},
  agentTools: [],
};

describe("Connector", () => {
  let tmp: string;
  let store: MemorySecrets;
  let runs: [string, readonly string[]][];
  let rest: GitProviderClient;
  let deps: ConnectorDeps;
  const create = (input: Partial<CreateConnectorInput>) =>
    new CreateConnectorAction(new CreateConnectorTask(), new WriteConnectorSecretsTask(store)).run({ ...base, ...input });

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "spec-studio-conn-"));
    setDataDriverForTesting(new JsonDataDriver(tmp));
    store = new MemorySecrets();
    runs = [];
    rest = {
      whoami: vi.fn(async () => ({ login: "octo", scopes: ["repo"] })),
      listRepos: vi.fn(async () => []),
      listBranches: vi.fn(async () => []),
      findOpenPullRequest: vi.fn(async () => undefined),
      createPullRequest: vi.fn(async () => ({ number: 7, url: "https://github.com/a/b/pull/7" })),
    };
    deps = {
      secrets: store,
      restClient: vi.fn(() => rest),
      mcp: { withClient: vi.fn(), listTools: vi.fn(), call: vi.fn() },
      process: {
        which: vi.fn(async (bin: string) => (bin === "gh" ? "/usr/bin/gh" : undefined)),
        versionOf: vi.fn(async () => "gh version 2.80.0"),
        run: vi.fn(async (cmd: string, args: readonly string[]) => {
          runs.push([cmd, args]);
          if (args[0] === "auth" && args[1] === "token") return res(0, "gho_clitoken");
          if (args[0] === "auth" && args[1] === "status") return res(0, "github.com\n  ✓ Logged in to github.com account octo (keyring)\n  - Token scopes: 'gist', 'repo'");
          return res(1);
        }),
      },
    };
  });
  afterEach(() => {
    setDataDriverForTesting(undefined);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("TOKEN: token chỉ nằm trong secret store; git nhận header qua GIT_CONFIG_*, remote không đổi", async () => {
    const c = await create({ token: "ghp_pat" });
    expect(c.has_token).toBe(true);
    expect(JSON.stringify(c)).not.toContain("ghp_pat");
    const out = await new ResolveGitCredentialsTask(new ConnectorRepository(), deps).run({ connectorId: c.id, remote: "https://github.com/a/b.git" });
    expect(out.remoteUrl).toBe("https://github.com/a/b.git");
    expect(out.env.GIT_CONFIG_KEY_0).toBe("http.https://github.com/.extraHeader");
    expect(Buffer.from(out.env.GIT_CONFIG_VALUE_0.replace("Authorization: Basic ", ""), "base64").toString()).toBe("x-access-token:ghp_pat");
  });

  it("connectorId null: ưu tiên CLI hơn TOKEN cùng host; SSH remote giữ nguyên, không header", async () => {
    await create({ token: "ghp_pat" });
    await create({ type: "CLI", command: "gh" });
    await create({ type: "TOKEN", provider: "GITLAB", token: "glpat" });
    const task = new ResolveGitCredentialsTask(new ConnectorRepository(), deps);
    const out = await task.run({ connectorId: null, remote: "https://github.com/a/b.git" });
    expect(Buffer.from(out.env.GIT_CONFIG_VALUE_0.split(" ").pop()!, "base64").toString()).toBe("x-access-token:gho_clitoken");
    expect(await task.run({ connectorId: null, remote: "git@github.com:a/b.git" })).toEqual({ env: { GIT_TERMINAL_PROMPT: "0" }, remoteUrl: "git@github.com:a/b.git" });
  });

  it("CreatePullRequestTask dùng lại PR đang mở cho cùng head", async () => {
    const c = await create({ token: "ghp_pat" });
    const task = new CreatePullRequestTask(new ConnectorRepository(), deps);
    const pr = { connectorId: c.id, repo: "a/b", head: "spec/x", base: "main", title: "t", body: "b" };
    expect(await task.run(pr)).toEqual({ number: 7, url: "https://github.com/a/b/pull/7", created: true });
    rest.findOpenPullRequest = vi.fn(async () => ({ number: 7, url: "u" }));
    expect(await task.run(pr)).toEqual({ number: 7, url: "u", created: false });
    expect(rest.createPullRequest).toHaveBeenCalledTimes(1);
  });

  it("Kiểm tra CLI: đọc tài khoản + scope; CLI không có → CLI_NOT_FOUND; dò CLI không đọc token", async () => {
    const gh = await create({ type: "CLI", command: null });
    expect(gh.command).toBe("gh");
    expect(await new CheckConnectorTask(deps).run({ connector: gh })).toMatchObject({ status: "CONNECTED", account: "octo", scopes: ["gist", "repo"], host: "github.com" });
    const glab = await create({ type: "CLI", provider: "GITLAB", command: "glab" });
    expect((await new CheckConnectorTask(deps).run({ connector: glab })).status).toBe("CLI_NOT_FOUND");

    runs.length = 0;
    const detected = await new DetectCliTask(deps).run();
    expect(detected.find((d) => d.command === "gh")).toMatchObject({ loggedIn: true, account: "octo", host: "github.com", version: "gh version 2.80.0" });
    expect(detected.find((d) => d.command === "tea")).toMatchObject({ path: null, loggedIn: false });
    expect(runs.some(([, args]) => args.includes("token"))).toBe(false);
  });

  it("xoá connector xoá luôn secret", async () => {
    const c = await create({ type: "MCP", transport: "STDIO", command: "npx", secrets: { GITHUB_PERSONAL_ACCESS_TOKEN: "x" } });
    expect(c.secret_keys).toEqual(["GITHUB_PERSONAL_ACCESS_TOKEN"]);
    expect(store.data.size).toBe(1);
    await new DeleteConnectorAction(new GetConnectorTask(), new DeleteConnectorTask(), new WriteConnectorSecretsTask(store)).run({ connectorId: c.id });
    expect(store.data.size).toBe(0);
  });
});
