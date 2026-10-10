import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeleteWorkspaceFolderTask } from "../Tasks/DeleteWorkspaceFolderTask";

describe("DeleteWorkspaceFolderTask", () => {
  let root: string;
  const ws = () => path.join(root, "a", "ws");
  const makeWs = async (dir: string) => {
    await mkdir(path.join(dir, ".spec-studio"), { recursive: true });
    await writeFile(path.join(dir, ".spec-studio", "config.json"), "{}");
    await writeFile(path.join(dir, "spec.md"), "# x");
  };
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "ws-delete-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("xoá thư mục workspace hợp lệ; thư mục đã mất thì bỏ qua", async () => {
    await makeWs(ws());
    expect(await new DeleteWorkspaceFolderTask().run({ dir: ws(), otherPaths: [] })).toEqual({ deleted: true });
    await expect(stat(ws())).rejects.toMatchObject({ code: "ENOENT" });
    expect(await new DeleteWorkspaceFolderTask().run({ dir: ws(), otherPaths: [] })).toEqual({ deleted: false });
  });

  it("từ chối: không có .spec-studio/config.json, symlink, home, chứa workspace khác", async () => {
    await mkdir(ws(), { recursive: true });
    await expect(new DeleteWorkspaceFolderTask().run({ dir: ws(), otherPaths: [] })).rejects.toMatchObject({ code: "WORKSPACE.DELETE_UNSAFE" });

    await makeWs(ws());
    const link = path.join(root, "a", "link");
    await symlink(ws(), link);
    await expect(new DeleteWorkspaceFolderTask().run({ dir: link, otherPaths: [] })).rejects.toMatchObject({ code: "WORKSPACE.DELETE_UNSAFE" });

    await expect(new DeleteWorkspaceFolderTask().run({ dir: os.homedir(), otherPaths: [] })).rejects.toMatchObject({ code: "WORKSPACE.DELETE_UNSAFE" });

    await makeWs(path.join(ws(), "inner"));
    await expect(new DeleteWorkspaceFolderTask().run({ dir: ws(), otherPaths: [path.join(ws(), "inner")] })).rejects.toMatchObject({
      code: "WORKSPACE.HAS_NESTED_WORKSPACES",
    });
    expect((await stat(ws())).isDirectory()).toBe(true);
  });
});
