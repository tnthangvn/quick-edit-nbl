import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { redactCredentials } from "@/ship/adapters/git";
import { gitFailure } from "../Exceptions/mapFailures";
import type { CreatePullRequestTask } from "../../Connector/Tasks/CreatePullRequestTask";
import type { ResolveGitCredentialsTask } from "../../Connector/Tasks/ResolveGitCredentialsTask";
import type { GitStorageConfig } from "../../Setting/Models/WorkspaceConfig";
import { PublishGitChangesSubAction, renderPrBranch } from "../SubActions/PublishGitChangesSubAction";
import { CloneRepositoryTask } from "../Tasks/CloneRepositoryTask";
import { CommitFilesTask } from "../Tasks/CommitFilesTask";
import { CommitToBranchTask } from "../Tasks/CommitToBranchTask";
import { GetGitStatusTask } from "../Tasks/GetGitStatusTask";
import { PullGitTask } from "../Tasks/PullGitTask";
import { PushGitTask } from "../Tasks/PushGitTask";

const ID = ["-c", "user.email=t@t", "-c", "user.name=t"];
const git = (cwd: string, ...args: string[]) => execFileSync("git", [...ID, ...args], { cwd, encoding: "utf8" }).trim();

describe("Storage git tasks (repo thật trong thư mục tạm)", () => {
  let root: string;
  let remote: string;
  let work: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "storage-git-"));
    remote = path.join(root, "remote.git");
    work = path.join(root, "work");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", remote]);
    execFileSync("git", ["init", "-q", "-b", "main", work]);
    git(work, "config", "user.email", "t@t");
    git(work, "config", "user.name", "t");
    mkdirSync(path.join(work, "specs"));
    writeFileSync(path.join(work, "specs/a.md"), "a");
    writeFileSync(path.join(work, "other.txt"), "o");
    git(work, "add", "-A");
    git(work, "commit", "-qm", "init");
    git(work, "push", "-q", remote, "main:main");
    git(work, "fetch", "-q", remote, "+refs/heads/main:refs/remotes/origin/main");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("commit chỉ các path đã cho, giữ nguyên thay đổi đã stage khác; push; status", async () => {
    writeFileSync(path.join(work, "specs/a.md"), "a2");
    writeFileSync(path.join(work, "other.txt"), "o2");
    git(work, "add", "other.txt");

    const status = await new GetGitStatusTask().run({ cwd: work, branch: "main", paths: [path.join(work, "specs")] });
    expect(status.changed).toEqual([{ path: path.join(work, "specs/a.md"), deleted: false }]);

    const r = await new CommitFilesTask().run({ cwd: work, paths: [path.join(work, "specs/a.md")], message: "docs: a" });
    expect(r.committed).toBe(true);
    expect(git(work, "status", "--porcelain")).toBe("M  other.txt");
    expect((await new CommitFilesTask().run({ cwd: work, paths: [path.join(work, "specs")], message: "x" })).committed).toBe(false);

    expect((await new GetGitStatusTask().run({ cwd: work, branch: "main", paths: ["specs"] })).ahead).toBe(1);
    await new PushGitTask().run({ cwd: work, remoteUrl: remote, env: {}, source: r.sha, branch: "main", trackOrigin: true });
    expect(git(remote, "rev-parse", "main")).toBe(r.sha);
    expect((await new GetGitStatusTask().run({ cwd: work, branch: "main", paths: ["specs"] })).ahead).toBe(0);
  });

  it("pull --ff-only; lịch sử tách nhánh → STORAGE.PULL_CONFLICT; push bị từ chối → STORAGE.PUSH_REJECTED", async () => {
    const other = path.join(root, "other");
    execFileSync("git", ["clone", "-q", remote, other]);
    writeFileSync(path.join(other, "specs/b.md"), "b");
    git(other, "add", "-A");
    git(other, "commit", "-qm", "b");
    git(other, "push", "-q", "origin", "main");

    const pulled = await new PullGitTask().run({ cwd: work, remoteUrl: remote, env: {}, branch: "main" });
    expect(pulled.changedFiles).toEqual(["specs/b.md"]);

    writeFileSync(path.join(other, "specs/b.md"), "b2");
    git(other, "commit", "-qam", "b2");
    git(other, "push", "-q", "origin", "main");
    writeFileSync(path.join(work, "specs/a.md"), "local");
    git(work, "commit", "-qam", "local");

    await expect(new PushGitTask().run({ cwd: work, remoteUrl: remote, env: {}, source: "HEAD", branch: "main", trackOrigin: false })).rejects.toMatchObject({
      code: "STORAGE.PUSH_REJECTED",
    });
    await expect(new PullGitTask().run({ cwd: work, remoteUrl: remote, env: {}, branch: "main" })).rejects.toMatchObject({ code: "STORAGE.PULL_CONFLICT" });
  });

  it("commit lên branch PR không đổi working tree / branch đang checkout", async () => {
    writeFileSync(path.join(work, "specs/a.md"), "pr content");
    const head = git(work, "rev-parse", "HEAD");
    const r = await new CommitToBranchTask().run({
      cwd: work,
      branch: "spec/x",
      baseBranch: "main",
      files: [path.join(work, "specs/a.md")],
      message: "docs: pr",
      remote: { url: remote, env: {} },
    });
    expect(r.committed).toBe(true);
    expect(git(work, "rev-parse", "HEAD")).toBe(head);
    expect(git(work, "rev-parse", "--abbrev-ref", "HEAD")).toBe("main");
    expect(git(work, "show", "spec/x:specs/a.md")).toBe("pr content");
    expect(git(work, "status", "--porcelain")).toBe("M specs/a.md");
    // Lần 2 không đổi gì → không commit, trả đầu branch hiện có.
    expect(await new CommitToBranchTask().run({ cwd: work, branch: "spec/x", baseBranch: "main", files: ["specs/a.md"], message: "m" })).toEqual({
      committed: false,
      sha: r.sha,
    });
  });

  it("PublishGitChangesSubAction PULL_REQUEST: push branch spec/{date}-{filename} rồi tạo PR qua connector", async () => {
    const prCalls: unknown[] = [];
    const creds = { run: async () => ({ env: {}, remoteUrl: remote }) } as unknown as ResolveGitCredentialsTask;
    const pr = { run: async (i: unknown) => (prCalls.push(i), { number: 12, url: "https://x/pr/12", created: true }) } as unknown as CreatePullRequestTask;
    const config: GitStorageConfig = {
      provider: "GITHUB",
      host: "github.com",
      connectorId: "c1",
      repo: "o/r",
      remote: "https://github.com/o/r.git",
      branch: "main",
      subdir: "specs",
      publishMode: "PULL_REQUEST",
      prBranchTemplate: "spec/{date}-{filename}",
      autoCommit: true,
      autoPush: true,
      commitMessage: "docs(spec): {action} {filename}",
      pullOnOpen: false,
    };
    writeFileSync(path.join(work, "specs/a.md"), "approved");
    const sub = new PublishGitChangesSubAction(undefined, undefined, undefined, creds, pr);
    const details: string[] = [];
    const out = await sub.run({
      workspacePath: work,
      git: config,
      files: [path.join(work, "specs/a.md")],
      action: "update",
      filename: "Sidebar Menu.md",
      push: true,
      onProgress: (d) => details.push(d),
    });
    const branch = renderPrBranch(config.prBranchTemplate, "Sidebar Menu.md");
    expect(branch).toMatch(/^spec\/\d{4}-\d{2}-\d{2}-sidebar-menu$/);
    expect(out).toMatchObject({ mode: "PULL_REQUEST", branch, committed: true, pushed: true, pullRequest: { number: 12 } });
    expect(git(remote, "show", `${branch}:specs/a.md`)).toBe("approved");
    expect(prCalls[0]).toMatchObject({ connectorId: "c1", repo: "o/r", head: branch, base: "main", title: "docs(spec): update Sidebar Menu.md" });
    expect(details).toEqual([`commit “docs(spec): update Sidebar Menu.md” → ${branch}`, `push ${branch}…`, "tạo pull request…"]);
  });

  it("clone bằng URL có token → origin trong .git/config không còn token", async () => {
    const target = path.join(root, "cloned");
    const tokenUrl = "https://user:s3cret@example.invalid/o/r.git";
    const env = { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: `url.${remote}.insteadOf`, GIT_CONFIG_VALUE_0: tokenUrl };
    const { headSha } = await new CloneRepositoryTask().run({ remoteUrl: tokenUrl, branch: "main", targetPath: target, env });
    expect(headSha).toBe(git(work, "rev-parse", "HEAD"));
    expect(readFileSync(path.join(target, ".git/config"), "utf8")).not.toContain("s3cret");
    expect(redactCredentials(`fatal: unable to access '${tokenUrl}'`)).not.toContain("s3cret");
  });

  it("branch chưa có trên remote → tạo nhánh mới từ branch mặc định rồi push lên remote", async () => {
    const target = path.join(root, "new-branch");
    const { headSha } = await new CloneRepositoryTask().run({ remoteUrl: remote, branch: "feature-x", targetPath: target, env: {} });
    expect(headSha).toBe(git(work, "rev-parse", "HEAD"));
    expect(git(target, "branch", "--show-current")).toBe("feature-x");
    expect(git(remote, "rev-parse", "feature-x")).toBe(headSha);
  });

  it("remote không truy cập được → STORAGE.CLONE_FAILED", async () => {
    await expect(
      new CloneRepositoryTask().run({ remoteUrl: "https://example.invalid/does/not/exist.git", branch: "main", targetPath: path.join(root, "c3"), env: {} }),
    ).rejects.toMatchObject({ code: "STORAGE.CLONE_FAILED" });
  });
});

describe("gitFailure", () => {
  it("thiếu user.name / user.email → STORAGE.GIT_IDENTITY_MISSING thay vì lỗi chung", () => {
    const stderr = "Author identity unknown\n\n*** Please tell me who you are.\n\nfatal: unable to auto-detect email address";
    expect(gitFailure("commit", { exitCode: 128, stdout: "", stderr, timedOut: false })).toMatchObject({ code: "STORAGE.GIT_IDENTITY_MISSING" });
    expect(gitFailure("commit", { exitCode: 1, stdout: "", stderr: "fatal: boom", timedOut: false })).toMatchObject({ code: "STORAGE.GIT_COMMAND_FAILED" });
  });
});
