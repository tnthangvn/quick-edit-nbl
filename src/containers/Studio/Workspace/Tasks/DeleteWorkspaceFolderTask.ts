import "server-only";
import { lstat, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { env } from "@/ship/engine/env";
import { Task } from "@/ship/parents/Task";
import { WorkspaceDeleteUnsafeException } from "../Exceptions/WorkspaceDeleteUnsafeException";
import { WorkspaceHasNestedWorkspacesException } from "../Exceptions/WorkspaceHasNestedWorkspacesException";

export type DeleteWorkspaceFolderInput = {
  /** Thư mục làm việc của Workspace (đường dẫn trong registry). */
  dir: string;
  /** Đường dẫn của các Workspace khác trong danh sách (không được nằm bên trong `dir`). */
  otherPaths: string[];
};

/** Ít nhất bao nhiêu cấp thư mục tính từ gốc (chặn xoá nhầm /home, /var...). */
const MIN_DEPTH = 3;

const isInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/**
 * Xoá vĩnh viễn thư mục Workspace trên máy (chỉ local; không đụng Git remote / Drive / NotebookLM).
 * Chốt chặn: tuyệt đối, đủ sâu, không phải symlink, không phải home / tổ tiên của home / dữ liệu app (SPEC_STUDIO_HOME),
 * phải có `.spec-studio/config.json` (đúng là thư mục Workspace), không chứa Workspace khác trong danh sách.
 * Thư mục đã không còn → bỏ qua (chỉ gỡ khỏi danh sách). `rm` không đi theo symlink bên trong.
 */
export class DeleteWorkspaceFolderTask extends Task<DeleteWorkspaceFolderInput, { deleted: boolean }> {
  async run({ dir: input, otherPaths }: DeleteWorkspaceFolderInput): Promise<{ deleted: boolean }> {
    const dir = path.resolve(input);
    const unsafe = (reason: string) => new WorkspaceDeleteUnsafeException({ reason, path: dir });

    if (!path.isAbsolute(input)) throw unsafe("NOT_ABSOLUTE");
    if (dir.split(path.sep).filter(Boolean).length < MIN_DEPTH) throw unsafe("TOO_SHALLOW");
    const home = path.resolve(os.homedir());
    if (isInside(home, dir)) throw unsafe("HOME");
    const appHome = path.resolve(env().SPEC_STUDIO_HOME);
    if (isInside(appHome, dir) || isInside(dir, appHome)) throw unsafe("APP_DATA");

    const stat = await lstat(dir).catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") return null;
      throw err;
    });
    if (!stat) return { deleted: false };
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe("NOT_DIRECTORY");
    const config = await lstat(path.join(dir, ".spec-studio", "config.json")).catch(() => null);
    if (!config?.isFile()) throw unsafe("NOT_WORKSPACE");

    const nested = otherPaths.map((p) => path.resolve(p)).filter((p) => isInside(p, dir));
    if (nested.length > 0) throw new WorkspaceHasNestedWorkspacesException({ paths: nested.join(", ") });

    await rm(dir, { recursive: true, force: false });
    return { deleted: true };
  }
}
