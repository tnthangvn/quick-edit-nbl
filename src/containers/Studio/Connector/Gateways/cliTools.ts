import "server-only";
import path from "node:path";
import type { GitProvider } from "@/ship/contracts/enums/sync";

/** CLI Git provider app biết cách đọc trạng thái đăng nhập và lấy token tạm (spec 3.0.2). */
export type KnownCli = {
  binary: string;
  provider: GitProvider;
  statusArgs: (host: string) => string[];
  /** Lệnh đọc trạng thái mọi host (Tự dò CLI, Tab 5). */
  detectArgs: string[];
  /** null = CLI không cho lấy token → chỉ kiểm tra đăng nhập, không gọi REST. */
  tokenArgs: ((host: string) => string[]) | null;
  loginCommand: (host: string) => string;
};

export const KNOWN_CLIS: KnownCli[] = [
  {
    binary: "gh",
    provider: "GITHUB",
    statusArgs: (host) => ["auth", "status", "--hostname", host],
    detectArgs: ["auth", "status"],
    tokenArgs: (host) => ["auth", "token", "--hostname", host],
    loginCommand: (host) => (!host || host === "github.com" ? "gh auth login" : `gh auth login --hostname ${host}`),
  },
  {
    binary: "glab",
    provider: "GITLAB",
    statusArgs: (host) => ["auth", "status", "--hostname", host],
    detectArgs: ["auth", "status"],
    tokenArgs: (host) => ["config", "get", "token", "--host", host],
    loginCommand: (host) => (!host || host === "gitlab.com" ? "glab auth login" : `glab auth login --hostname ${host}`),
  },
  {
    binary: "tea",
    provider: "GITEA",
    statusArgs: () => ["login", "list", "--output", "simple"],
    detectArgs: ["login", "list", "--output", "simple"],
    tokenArgs: null,
    loginCommand: () => "tea login add",
  },
];

export const knownCliOf = (command: string): KnownCli | undefined => KNOWN_CLIS.find((c) => c.binary === path.basename(command));

/** Đọc tài khoản và phạm vi từ output `gh|glab auth status` (stdout hoặc stderr tuỳ phiên bản). */
export function parseAuthStatus(output: string): { host: string | null; account: string | null; scopes: string[] } {
  const login = /Logged in to (\S+) (?:account|as) ([\w.-]+)/.exec(output);
  const scopesLine = /Token scopes:\s*(.+)/.exec(output)?.[1] ?? "";
  const scopes = scopesLine
    .split(",")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter((s) => s && s.toLowerCase() !== "none");
  return { host: login?.[1] ?? null, account: login?.[2] ?? null, scopes };
}
