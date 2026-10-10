import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { stripUrlCredentials } from "@/ship/adapters/git";
import type { GitProvider } from "@/ship/contracts/enums/sync";
import { Task } from "@/ship/parents/Task";

export type GitConfigInfo = {
  /** Thư mục có `.git/config`. */
  hasGit: boolean;
  /** `url` của `[remote "origin"]` (hoặc remote đầu tiên), đã bỏ user/token. */
  remote: string | null;
  provider: GitProvider | null;
  host: string | null;
  /** owner/repo */
  repo: string | null;
  /** `[user] name` / `email` riêng của repo (tác giả commit), null nếu repo không khai. */
  userName: string | null;
  userEmail: string | null;
};

const NONE: GitConfigInfo = { hasGit: false, remote: null, provider: null, host: null, repo: null, userName: null, userEmail: null };
const MAX_BYTES = 256 * 1024;

type ParsedGitConfig = { remotes: { name: string; url: string }[]; user: { name: string | null; email: string | null } };

const unquote = (v: string) => v.trim().replace(/^"(.*)"$/, "$1");

/** Đọc các mục cần dùng trong .git/config (định dạng INI của git): `url` của từng `[remote "<tên>"]`, `[user] name/email`. */
export function parseGitConfig(config: string): ParsedGitConfig {
  const out: ParsedGitConfig = { remotes: [], user: { name: null, email: null } };
  let section: { kind: "remote"; name: string } | { kind: "user" } | null = null;
  for (const raw of config.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    if (line.startsWith("[")) {
      const remote = /^\[\s*remote\s+"([^"]+)"\s*\]$/i.exec(line);
      section = remote ? { kind: "remote", name: remote[1] } : /^\[\s*user\s*\]$/i.test(line) ? { kind: "user" } : null;
      continue;
    }
    const kv = /^([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!section || !kv) continue;
    const key = kv[1].toLowerCase();
    const value = unquote(kv[2]);
    if (section.kind === "remote" && key === "url") {
      const name = section.name;
      if (!out.remotes.some((r) => r.name === name)) out.remotes.push({ name, url: value });
    } else if (section.kind === "user" && (key === "name" || key === "email") && value) {
      out.user[key] = value;
    }
  }
  return out;
}

/** host + owner/repo từ URL remote (https://host/owner/repo.git, ssh://git@host/owner/repo, git@host:owner/repo.git). */
export function parseRemoteUrl(remote: string): { host: string; repo: string } | null {
  const scp = /^[\w.-]+@([^:/]+):(.+?)(?:\.git)?\/?$/.exec(remote);
  if (scp) return { host: scp[1].toLowerCase(), repo: scp[2] };
  try {
    const url = new URL(remote);
    const repo = url.pathname.replace(/^\/+/, "").replace(/\.git\/?$/, "").replace(/\/$/, "");
    return url.hostname && repo ? { host: url.hostname.toLowerCase(), repo } : null;
  } catch {
    return null;
  }
}

export function providerOfHost(host: string): GitProvider {
  if (host === "github.com" || host.startsWith("github.")) return "GITHUB";
  if (host === "bitbucket.org" || host.startsWith("bitbucket.")) return "BITBUCKET";
  if (host === "gitlab.com" || host.startsWith("gitlab.")) return "GITLAB";
  if (host.startsWith("gitea.") || host === "codeberg.org") return "GITEA";
  return "GENERIC";
}

/**
 * Chỉ đọc `<dir>/.git/config` (không chạy git, không gọi mạng) để Wizard điền nhanh remote URL và hiện tác giả commit
 * (`[user]` của repo; không đọc ~/.gitconfig).
 * Không có file / `.git` là file (worktree, submodule) / quá lớn → hasGit = false.
 */
export class ReadGitConfigTask extends Task<{ dir: string }, GitConfigInfo> {
  async run({ dir }: { dir: string }): Promise<GitConfigInfo> {
    let content: string;
    try {
      const buf = await readFile(path.join(dir, ".git", "config"));
      if (buf.byteLength > MAX_BYTES) return NONE;
      content = buf.toString("utf8");
    } catch {
      return NONE;
    }
    const { remotes, user } = parseGitConfig(content);
    const author = { userName: user.name, userEmail: user.email };
    const picked = remotes.find((r) => r.name === "origin") ?? remotes[0];
    if (!picked) return { ...NONE, ...author, hasGit: true };
    const remote = stripUrlCredentials(picked.url);
    const parsed = parseRemoteUrl(remote);
    return { hasGit: true, remote, provider: parsed ? providerOfHost(parsed.host) : null, host: parsed?.host ?? null, repo: parsed?.repo ?? null, ...author };
  }
}
