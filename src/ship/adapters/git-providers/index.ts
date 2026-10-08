import "server-only";
import { BitbucketClient } from "./bitbucket";
import { GiteaClient } from "./gitea";
import { GitHubClient } from "./github";
import { GitLabClient } from "./gitlab";
import type { GitProviderClient, RestGitProvider } from "./types";

/** Host mặc định khi người dùng không nhập (bản cloud). */
export const DEFAULT_GIT_HOSTS: Partial<Record<RestGitProvider, string>> = {
  GITHUB: "github.com",
  GITLAB: "gitlab.com",
  BITBUCKET: "bitbucket.org",
};

/** Client REST theo provider. Token chỉ giữ trong bộ nhớ của client, không log. */
export function gitProviderClient(provider: RestGitProvider, host: string, token: string): GitProviderClient {
  switch (provider) {
    case "GITHUB":
      return new GitHubClient(host, token);
    case "GITLAB":
      return new GitLabClient(host, token);
    case "GITEA":
      return new GiteaClient(host, token);
    case "BITBUCKET":
      return new BitbucketClient(token);
  }
}

/**
 * Header Basic cho git qua HTTPS (truyền bằng GIT_CONFIG_* để token không bị ghi vào .git/config hay URL).
 * Username theo quy ước của từng provider.
 */
export function gitBasicAuth(provider: RestGitProvider, token: string): string {
  const pair =
    provider === "BITBUCKET" && token.includes(":")
      ? token
      : `${{ GITHUB: "x-access-token", GITLAB: "oauth2", BITBUCKET: "x-token-auth", GITEA: "oauth2" }[provider]}:${token}`;
  return `Basic ${Buffer.from(pair).toString("base64")}`;
}

export * from "./types";
