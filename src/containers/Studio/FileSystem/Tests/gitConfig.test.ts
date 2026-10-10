import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseGitConfig, parseRemoteUrl, providerOfHost, ReadGitConfigTask } from "../Tasks/ReadGitConfigTask";

const CONFIG = `[core]
\trepositoryformatversion = 0
[remote "upstream"]
\turl = https://github.com/acme/specs.git
[remote "origin"]
\turl = https://user:ghp_secret@github.com/tnthangvn/persional-specs.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
[user]
\tname = ThangTN
\temail = "thangtn@gmail.com"
[branch "main"]
\tremote = origin
`;

describe("ReadGitConfigTask", () => {
  it("đọc remote origin (bỏ token), provider, owner/repo và [user]", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "git-config-"));
    await mkdir(path.join(dir, ".git"));
    await writeFile(path.join(dir, ".git", "config"), CONFIG);
    expect(await new ReadGitConfigTask().run({ dir })).toEqual({
      hasGit: true,
      remote: "https://github.com/tnthangvn/persional-specs.git",
      provider: "GITHUB",
      host: "github.com",
      repo: "tnthangvn/persional-specs",
      userName: "ThangTN",
      userEmail: "thangtn@gmail.com",
    });
    await rm(dir, { recursive: true, force: true });
  });

  it("không có .git → hasGit false; parse dạng scp và host tự quản", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "git-config-"));
    expect((await new ReadGitConfigTask().run({ dir })).hasGit).toBe(false);
    await rm(dir, { recursive: true, force: true });
    expect(parseRemoteUrl("git@gitlab.company.vn:team/sub/specs.git")).toEqual({ host: "gitlab.company.vn", repo: "team/sub/specs" });
    expect(providerOfHost("gitlab.company.vn")).toBe("GITLAB");
    expect(providerOfHost("git.company.vn")).toBe("GENERIC");
    expect(parseGitConfig("[user]\nname = A").user).toEqual({ name: "A", email: null });
  });
});
