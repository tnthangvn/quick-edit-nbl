import "server-only";

/** Host (kèm port nếu có) của một git remote: https://host/..., ssh://git@host:22/..., git@host:owner/repo. */
export function remoteHost(remote: string): string | null {
  const scp = /^[\w.-]+@([\w.-]+):/.exec(remote);
  if (scp && !remote.includes("://")) return scp[1].toLowerCase();
  try {
    return new URL(remote).host.toLowerCase() || null;
  } catch {
    return null;
  }
}

export const isHttpRemote = (remote: string) => /^https?:\/\//i.test(remote);
