import "server-only";
import { randomBytes } from "node:crypto";
import { lstat, mkdir, readdir, readFile, realpath, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { SpecAlreadyExistsException } from "../Exceptions/SpecAlreadyExistsException";
import { SpecInvalidNameException } from "../Exceptions/SpecInvalidNameException";
import { SpecNotFoundException } from "../Exceptions/SpecNotFoundException";
import { SpecPathOutsideWorkspaceException } from "../Exceptions/SpecPathOutsideWorkspaceException";
import { SpecsDirNotFoundException } from "../Exceptions/SpecsDirNotFoundException";
import type { SpecFileInfo, SpecsLocation } from "../Models/SpecFile";

const MAX_NAME = 255;
const MAX_DEPTH = 8;
// Ký tự cấm trong từng đoạn tên file (Windows + ký tự điều khiển); cho phép khoảng trắng và Unicode.
const FORBIDDEN = /[<>:"\\|?*\u0000-\u001f\u007f]/u;

const isErrno = (err: unknown, code: string) => (err as NodeJS.ErrnoException)?.code === code;
const isInside = (root: string, target: string) => {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/**
 * Truy cập file spec `.md` trong `<workspace.path>/<specs_dir>`. Mọi đường dẫn đi qua `resolve()`:
 * chỉ nhận tên tương đối, đuôi .md, không có đoạn rỗng / "." / ".." / file ẩn, và sau khi giải symlink
 * vẫn phải nằm trong thư mục spec (chặn path traversal và symlink trỏ ra ngoài).
 */
export class SpecFileStore {
  private constructor(
    /** Thư mục spec đã giải symlink. */
    readonly root: string,
  ) {}

  static async open(location: SpecsLocation): Promise<SpecFileStore> {
    const workspaceRoot = path.resolve(location.workspacePath);
    const specsDir = path.resolve(workspaceRoot, location.specsDir || ".");
    if (!isInside(workspaceRoot, specsDir)) throw new SpecPathOutsideWorkspaceException();
    let realWorkspace: string;
    let realSpecs: string;
    try {
      realWorkspace = await realpath(workspaceRoot);
      realSpecs = await realpath(specsDir);
      if (!(await stat(realSpecs)).isDirectory()) throw new SpecsDirNotFoundException();
    } catch (err) {
      if (isErrno(err, "ENOENT") || isErrno(err, "ENOTDIR")) throw new SpecsDirNotFoundException();
      throw err;
    }
    if (!isInside(realWorkspace, realSpecs)) throw new SpecPathOutsideWorkspaceException();
    return new SpecFileStore(realSpecs);
  }

  /** Chuẩn hoá tên file (phân cách "/") hoặc ném SPEC.INVALID_NAME. */
  static normalizeName(file: string): string {
    const name = file.normalize("NFC").trim();
    if (!name || name.length > MAX_NAME || path.isAbsolute(name) || name.includes("\\")) throw new SpecInvalidNameException({ file });
    const parts = name.split("/");
    if (parts.length > MAX_DEPTH) throw new SpecInvalidNameException({ file });
    for (const part of parts) {
      if (!part || part === "." || part === "..") throw new SpecPathOutsideWorkspaceException({ file });
      if (part.startsWith(".") || part !== part.trim() || FORBIDDEN.test(part)) throw new SpecInvalidNameException({ file });
    }
    if (!/\.md$/i.test(name) || name.length <= 3) throw new SpecInvalidNameException({ file });
    return name;
  }

  /** Đường dẫn tuyệt đối đã kiểm tra. File (hoặc thư mục cha gần nhất đang tồn tại) phải nằm trong root sau khi giải symlink. */
  async resolve(file: string): Promise<{ name: string; abs: string }> {
    const name = SpecFileStore.normalizeName(file);
    const abs = path.resolve(this.root, ...name.split("/"));
    if (!isInside(this.root, abs)) throw new SpecPathOutsideWorkspaceException({ file });

    let probe = abs;
    for (;;) {
      try {
        const real = await realpath(probe);
        if (!isInside(this.root, real)) throw new SpecPathOutsideWorkspaceException({ file });
        break;
      } catch (err) {
        if (!isErrno(err, "ENOENT")) throw err;
        // Symlink hỏng trỏ ra ngoài: lstat thấy link nhưng realpath ENOENT → chặn.
        if (await lstat(probe).then((s) => s.isSymbolicLink(), () => false)) throw new SpecPathOutsideWorkspaceException({ file });
        const parent = path.dirname(probe);
        if (parent === probe || !isInside(this.root, parent)) break;
        probe = parent;
      }
    }
    return { name, abs };
  }

  async list(): Promise<SpecFileInfo[]> {
    const out: SpecFileInfo[] = [];
    const walk = async (dir: string, prefix: string, depth: number) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        const abs = path.join(dir, e.name);
        if (e.isDirectory() && depth < MAX_DEPTH) await walk(abs, rel, depth + 1);
        else if (e.isFile() && /\.md$/i.test(e.name)) {
          const s = await stat(abs);
          out.push({ file: rel, size: s.size, updatedAt: s.mtime.toISOString() });
        }
      }
    };
    await walk(this.root, "", 1);
    return out.sort((a, b) => a.file.localeCompare(b.file));
  }

  async info(file: string): Promise<SpecFileInfo> {
    const { name, abs } = await this.resolve(file);
    try {
      const s = await stat(abs);
      if (!s.isFile()) throw new SpecNotFoundException({ file: name });
      return { file: name, size: s.size, updatedAt: s.mtime.toISOString() };
    } catch (err) {
      if (isErrno(err, "ENOENT")) throw new SpecNotFoundException({ file: name });
      throw err;
    }
  }

  async read(file: string): Promise<{ info: SpecFileInfo; content: string }> {
    const info = await this.info(file);
    const { abs } = await this.resolve(info.file);
    return { info, content: await readFile(abs, "utf8") };
  }

  /** Ghi nguyên tử (file tạm ẩn cùng thư mục rồi rename). `mode: "create"` ném SPEC.ALREADY_EXISTS nếu đã có. */
  async write(file: string, content: string, mode: "create" | "upsert"): Promise<{ info: SpecFileInfo; created: boolean }> {
    const { name, abs } = await this.resolve(file);
    const existed = await stat(abs).then(
      (s) => s.isFile(),
      () => false,
    );
    if (existed && mode === "create") throw new SpecAlreadyExistsException({ file: name });
    await mkdir(path.dirname(abs), { recursive: true });
    await this.resolve(name); // thư mục cha vừa tạo vẫn phải nằm trong root
    const tmp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomBytes(6).toString("hex")}.tmp`);
    try {
      await writeFile(tmp, content, { encoding: "utf8", flag: "wx" });
      if (mode === "create") {
        // Không ghi đè file vừa được tạo song song.
        if (await stat(abs).then(() => true, () => false)) throw new SpecAlreadyExistsException({ file: name });
      }
      await rename(tmp, abs);
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
    return { info: await this.info(name), created: !existed };
  }

  async rename(from: string, to: string): Promise<SpecFileInfo> {
    const src = await this.resolve(from);
    await this.info(src.name);
    const dst = await this.resolve(to);
    if (src.abs === dst.abs) return this.info(dst.name);
    if (await stat(dst.abs).then(() => true, () => false)) {
      // Cho phép đổi hoa/thường trên hệ file không phân biệt (cùng inode).
      const [a, b] = await Promise.all([stat(src.abs), stat(dst.abs)]);
      if (a.ino !== b.ino) throw new SpecAlreadyExistsException({ file: dst.name });
    }
    await mkdir(path.dirname(dst.abs), { recursive: true });
    await this.resolve(dst.name);
    await rename(src.abs, dst.abs);
    return this.info(dst.name);
  }

  async remove(file: string): Promise<string> {
    const { name, abs } = await this.resolve(file);
    try {
      if (!(await lstat(abs)).isFile()) throw new SpecNotFoundException({ file: name });
      await unlink(abs);
    } catch (err) {
      if (isErrno(err, "ENOENT")) throw new SpecNotFoundException({ file: name });
      throw err;
    }
    return name;
  }
}
