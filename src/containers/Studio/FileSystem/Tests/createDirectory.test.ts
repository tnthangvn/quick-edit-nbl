import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CreateDirectoryTask } from "../Tasks/CreateDirectoryTask";
import { DirectoryName } from "../UI/API/Requests/CreateDirectoryRequest";

describe("CreateDirectoryTask", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "mkdir-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("tạo thư mục con; trùng tên → DIRECTORY_EXISTS; cha không có → DIRECTORY_NOT_FOUND", async () => {
    const task = new CreateDirectoryTask();
    expect(await task.run({ parent: root, name: "specs" })).toEqual({ path: path.join(root, "specs") });
    expect((await stat(path.join(root, "specs"))).isDirectory()).toBe(true);
    await expect(task.run({ parent: root, name: "specs" })).rejects.toMatchObject({ code: "FILESYSTEM.DIRECTORY_EXISTS" });
    await expect(task.run({ parent: path.join(root, "missing"), name: "x" })).rejects.toMatchObject({ code: "FILESYSTEM.DIRECTORY_NOT_FOUND" });
  });

  it("tên thư mục: chặn /, \\, '..', ký tự điều khiển", () => {
    expect(DirectoryName.safeParse("new folder").success).toBe(true);
    for (const bad of ["a/b", "a\\b", "..", ".", "a\u0001", "  "]) expect(DirectoryName.safeParse(bad).success).toBe(false);
  });
});
