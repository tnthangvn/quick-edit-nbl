import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { directoryWatchers } from "@/ship/adapters/watcher";
import { SpecFileStore } from "../Data/SpecFileStore";

describe("SpecFileStore", () => {
  let ws: string;
  let store: SpecFileStore;

  beforeEach(async () => {
    ws = mkdtempSync(path.join(os.tmpdir(), "spec-store-"));
    mkdirSync(path.join(ws, "specs/sub"), { recursive: true });
    writeFileSync(path.join(ws, "specs/a.md"), "# A");
    writeFileSync(path.join(ws, "specs/sub/b.md"), "# B");
    writeFileSync(path.join(ws, "specs/note.txt"), "x");
    mkdirSync(path.join(ws, "specs/.hidden"));
    writeFileSync(path.join(ws, "specs/.hidden/c.md"), "x");
    writeFileSync(path.join(ws, "secret.md"), "secret");
    store = await SpecFileStore.open({ workspacePath: ws, specsDir: "./specs" });
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("liệt kê .md đệ quy, bỏ file ẩn và file khác đuôi", async () => {
    expect((await store.list()).map((f) => f.file)).toEqual(["a.md", "sub/b.md"]);
  });

  it("chặn path traversal, tên sai, symlink trỏ ra ngoài", async () => {
    await expect(store.read("../secret.md")).rejects.toMatchObject({ code: "SPEC.PATH_OUTSIDE_WORKSPACE" });
    await expect(store.read("sub/../../secret.md")).rejects.toMatchObject({ code: "SPEC.PATH_OUTSIDE_WORKSPACE" });
    await expect(store.read("/etc/passwd.md")).rejects.toMatchObject({ code: "SPEC.INVALID_NAME" });
    await expect(store.read("a.txt")).rejects.toMatchObject({ code: "SPEC.INVALID_NAME" });
    await expect(store.read(".hidden/c.md")).rejects.toMatchObject({ code: "SPEC.INVALID_NAME" });
    await expect(store.read("a\\b.md")).rejects.toMatchObject({ code: "SPEC.INVALID_NAME" });

    symlinkSync(path.join(ws, "secret.md"), path.join(ws, "specs/link.md"));
    await expect(store.read("link.md")).rejects.toMatchObject({ code: "SPEC.PATH_OUTSIDE_WORKSPACE" });
    symlinkSync(ws, path.join(ws, "specs/out"));
    await expect(store.write("out/x.md", "x", "create")).rejects.toMatchObject({ code: "SPEC.PATH_OUTSIDE_WORKSPACE" });
    symlinkSync("/nonexistent-target", path.join(ws, "specs/dangling.md"));
    await expect(store.write("dangling.md", "x", "upsert")).rejects.toMatchObject({ code: "SPEC.PATH_OUTSIDE_WORKSPACE" });
  });

  it("specs_dir nằm ngoài Workspace bị chặn", async () => {
    await expect(SpecFileStore.open({ workspacePath: path.join(ws, "specs"), specsDir: "../" })).rejects.toMatchObject({ code: "SPEC.PATH_OUTSIDE_WORKSPACE" });
    await expect(SpecFileStore.open({ workspacePath: ws, specsDir: "./missing" })).rejects.toMatchObject({ code: "SPEC.SPECS_DIR_NOT_FOUND" });
  });

  it("tạo / ghi đè nguyên tử, tên Unicode có khoảng trắng, đổi tên, xoá", async () => {
    const name = "Tiếng Việt có dấu.md";
    const created = await store.write(name, "v1", "create");
    expect(created).toMatchObject({ created: true, info: { file: name, size: 2 } });
    await expect(store.write(name, "v2", "create")).rejects.toMatchObject({ code: "SPEC.ALREADY_EXISTS" });
    expect((await store.write(name, "v2", "upsert")).created).toBe(false);
    expect(readFileSync(path.join(ws, "specs", name), "utf8")).toBe("v2");
    expect(readdirSync(path.join(ws, "specs")).filter((f) => f.endsWith(".tmp"))).toEqual([]);

    await expect(store.rename(name, "a.md")).rejects.toMatchObject({ code: "SPEC.ALREADY_EXISTS" });
    expect((await store.rename(name, "new/dir/x.md")).file).toBe("new/dir/x.md");
    await expect(store.read(name)).rejects.toMatchObject({ code: "SPEC.NOT_FOUND" });
    expect(await store.remove("new/dir/x.md")).toBe("new/dir/x.md");
    await expect(store.remove("new/dir/x.md")).rejects.toMatchObject({ code: "SPEC.NOT_FOUND" });
  });

  it("watcher dùng chung theo thư mục, đóng khi hết subscriber", async () => {
    const before = directoryWatchers.size;
    const off1 = directoryWatchers.subscribe(store.root, () => {});
    const off2 = directoryWatchers.subscribe(store.root, () => {});
    expect(directoryWatchers.size).toBe(before + 1);
    off1();
    expect(directoryWatchers.size).toBe(before + 1);
    off2();
    off2();
    expect(directoryWatchers.size).toBe(before);
  });
});
