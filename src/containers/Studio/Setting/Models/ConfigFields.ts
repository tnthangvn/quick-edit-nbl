import path from "node:path";
import { z } from "zod";

/**
 * Field dùng chung cho cấu hình Workspace (registry, config.json, request tạo/sửa).
 * Kiểm tra ngay ở schema để mọi nơi đọc config.json (kể cả container khác) đều nhận giá trị an toàn:
 * không path traversal, không chèn tham số vào lệnh git.
 */

/** Đường dẫn tuyệt đối đã chuẩn hoá, không phải thư mục gốc hệ thống. */
export const AbsolutePath = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .refine((p) => !p.includes("\0") && path.isAbsolute(p) && path.resolve(p) !== path.parse(path.resolve(p)).root, {
    message: "WORKSPACE.INVALID_PATH",
  })
  .transform((p) => path.resolve(p));

/** true nếu `dir` là đường dẫn tương đối nằm trong thư mục gốc (không tuyệt đối, không "..", không ký tự NUL). */
export function isInsideRelative(dir: string): boolean {
  if (dir.includes("\0") || path.isAbsolute(dir) || /^[a-zA-Z]:/.test(dir)) return false;
  const normalized = path.posix.normalize(dir.replaceAll("\\", "/"));
  return normalized !== ".." && !normalized.startsWith("../");
}

/** Thư mục con chứa spec, tương đối với workspacePath (mặc định "./specs"). */
export const SpecsDir = z.string().trim().min(1).max(255).refine(isInsideRelative, { message: "WORKSPACE.INVALID_SPECS_DIR" });

/** Thư mục con trong repo; "." = gốc repo. */
export const RepoSubdir = z.string().trim().max(255).refine((d) => d === "" || isInsideRelative(d), { message: "WORKSPACE.INVALID_SPECS_DIR" });

const SCP_LIKE = /^[\w.-]+@[\w.-]+:[\w./~-]+$/;

/** Git remote: https://, ssh:// hoặc dạng scp git@host:owner/repo. Chặn file://, ext:: và giá trị bắt đầu bằng "-". */
export function isSafeGitRemote(remote: string): boolean {
  if (remote.startsWith("-") || /\s/.test(remote)) return false;
  if (SCP_LIKE.test(remote)) return true;
  try {
    const url = new URL(remote);
    return (url.protocol === "https:" || url.protocol === "http:" || url.protocol === "ssh:") && !!url.hostname;
  } catch {
    return false;
  }
}

export const GitRemoteUrl = z.string().trim().min(1).max(2048).refine(isSafeGitRemote, { message: "WORKSPACE.INVALID_GIT_REMOTE" });

/** Tên branch theo git check-ref-format (rút gọn), không bắt đầu bằng "-". */
export const GitBranchName = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine((b) => /^[\w][\w./-]*$/.test(b) && !b.includes("..") && !b.endsWith(".lock") && !b.endsWith("/") && !b.endsWith("."), {
    message: "WORKSPACE.INVALID_BRANCH",
  });

/** "owner/repo" (GitLab cho phép nhiều cấp group: "group/sub/repo"). */
export const RepoFullName = z
  .string()
  .trim()
  .min(3)
  .max(255)
  .refine((r) => /^[\w.-]+(\/[\w.-]+)+$/.test(r) && !r.split("/").some((s) => s === "." || s === ".."), {
    message: "WORKSPACE.INVALID_REPO",
  });

/** Host Git (vd "github.com", "gitlab.company.vn:8443"), không có scheme hay path. */
export const GitHost = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9.-]+(:\d{1,5})?$/);

/** Notebook ID hoặc URL notebook (tự tách ID). */
export function extractNotebookId(value: string): string | null {
  const v = value.trim();
  const fromUrl = /\/notebook\/([\w-]+)/.exec(v)?.[1];
  if (fromUrl) return fromUrl;
  return /^[\w-]{4,200}$/.test(v) ? v : null;
}

/** Drive Folder ID hoặc URL thư mục Drive (tự tách ID). */
export function extractDriveFolderId(value: string): string | null {
  const v = value.trim();
  const fromUrl = /\/folders\/([\w-]+)/.exec(v)?.[1] ?? /[?&]id=([\w-]+)/.exec(v)?.[1];
  if (fromUrl) return fromUrl;
  return /^[\w-]{4,200}$/.test(v) ? v : null;
}

export const NotebookIdField = z.string().trim().max(500).refine((v) => extractNotebookId(v) !== null, { message: "FIELD.INVALID_FORMAT" });
export const DriveFolderIdField = z.string().trim().max(500).refine((v) => extractDriveFolderId(v) !== null, { message: "FIELD.INVALID_FORMAT" });
