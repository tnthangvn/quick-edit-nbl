import "server-only";
import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Thư mục không bao giờ chép vào sandbox / không quét khi so sánh. */
export const SKIPPED_DIRS = new Set([".git", "node_modules"]);
/** File .md lớn hơn ngưỡng này bị bỏ qua khi so sánh. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const isMarkdown = (name: string) => /\.md$/i.test(name);

/**
 * Liệt kê file .md thường (không phải symlink) trong `root`, trả đường dẫn tương đối dạng POSIX.
 * Không đi theo symlink nên không thể thoát ra ngoài `root`.
 */
export async function listMarkdownFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) await walk(abs);
      } else if (entry.isFile() && isMarkdown(entry.name) && (await lstat(abs)).size <= MAX_FILE_BYTES) {
        out.push(path.relative(root, abs).split(path.sep).join("/"));
      }
    }
  }
  await walk(root);
  return out.sort();
}

export const sha256 = (content: string | Buffer) => createHash("sha256").update(content).digest("hex");

/** Băm từng file .md: dùng làm mốc để biết CLI đã sửa file nào. */
export async function hashMarkdownFiles(root: string): Promise<Map<string, string>> {
  const files = await listMarkdownFiles(root);
  const entries = await Promise.all(files.map(async (f) => [f, sha256(await readFile(path.join(root, f)))] as const));
  return new Map(entries);
}
