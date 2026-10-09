import "server-only";
import { run, type RunResult } from "@/ship/adapters/process";

export type GitRunOptions = { cwd?: string; env?: Record<string, string>; timeout?: number };

/** Chạy một lệnh git (không qua shell). Tiêm được vào Task để test bằng runner giả. */
export type GitRunner = (args: readonly string[], opts?: GitRunOptions) => Promise<RunResult>;

/** Git thật: tắt hỏi mật khẩu tương tác (không treo request khi thiếu credential), timeout mặc định 2 phút. */
export const runGit: GitRunner = (args, opts = {}) =>
  run("git", args, {
    cwd: opts.cwd,
    timeout: opts.timeout ?? 120_000,
    env: { GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never", ...opts.env },
  });

/** Xoá thông tin đăng nhập trong URL (https://user:token@host → https://***@host) trước khi log / trả ra ngoài. */
export function redactCredentials(text: string): string {
  return text.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, "$1***@");
}

/** URL remote không kèm user/token (để ghi vào .git/config sau khi clone bằng URL có token). */
export function stripUrlCredentials(remote: string): string {
  try {
    const url = new URL(remote);
    if (!url.username && !url.password) return remote;
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return remote; // dạng scp (git@host:owner/repo) không chứa token
  }
}

/** stderr (hoặc stdout) đã che credential, cắt gọn để đặt vào params.detail. */
export function gitErrorDetail(r: RunResult, max = 600): string {
  const text = redactCredentials((r.stderr || r.stdout).trim());
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Phân loại lỗi git từ stderr để chọn mã lỗi phù hợp. */
export function classifyGitFailure(r: RunResult): "AUTH" | "REJECTED" | "CONFLICT" | "IDENTITY" | "OTHER" {
  const s = `${r.stderr}\n${r.stdout}`;
  if (/author identity unknown|please tell me who you are|unable to auto-detect email address|empty ident name/i.test(s)) return "IDENTITY";
  if (/authentication failed|could not read (username|password)|permission denied|access denied|\b403\b|\b401\b|invalid credentials/i.test(s)) return "AUTH";
  if (/\[rejected\]|non-fast-forward|fetch first|remote rejected|protected branch/i.test(s)) return "REJECTED";
  if (/not possible to fast-forward|diverg|conflict|would be overwritten|unmerged/i.test(s)) return "CONFLICT";
  return "OTHER";
}
