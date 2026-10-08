import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DRIVE_GOOGLE_DOC_MIME, GoogleError, type DriveFile, type DriveGateway } from "@/ship/adapters/google";
import { DownloadDriveFolderTask } from "../Tasks/DownloadDriveFolderTask";
import { UploadDriveFileTask } from "../Tasks/UploadDriveFileTask";

const file = (id: string, name: string, mimeType = "text/markdown"): DriveFile => ({ id, name, mimeType, modifiedTime: null, webViewLink: null });

class FakeDrive implements DriveGateway {
  uploads: { name: string; asGoogleDoc: boolean }[] = [];
  constructor(private readonly items: DriveFile[]) {}
  async getFolder(folderId: string) {
    return { id: folderId, name: "Specs" };
  }
  async listFolder() {
    return this.items;
  }
  async readText(f: Pick<DriveFile, "id" | "mimeType">) {
    return f.mimeType === DRIVE_GOOGLE_DOC_MIME ? `# exported ${f.id}` : `# raw ${f.id}`;
  }
  async upsertText(input: { folderId: string; name: string; content: string; asGoogleDoc: boolean }) {
    this.uploads.push({ name: input.name, asGoogleDoc: input.asGoogleDoc });
    return { ...file("new", input.name), webViewLink: "https://drive/x", created: false };
  }
}

describe("Drive tasks (gateway giả)", () => {
  let dir: string;
  beforeEach(() => (dir = mkdtempSync(path.join(os.tmpdir(), "drive-"))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("tải .md và Google Doc (xuất Markdown), bỏ tên không an toàn / không phải spec", async () => {
    const drive = new FakeDrive([
      file("1", "a.md"),
      file("2", "Ghi chú", DRIVE_GOOGLE_DOC_MIME),
      file("3", "image.png", "image/png"),
      file("4", "../evil.md"),
      file("5", ".hidden.md"),
    ]);
    const { files } = await new DownloadDriveFolderTask(async () => drive).run({ folderId: "f", targetDir: path.join(dir, "specs") });
    expect(files).toEqual(["Ghi chú.md", "a.md"]);
    expect(readFileSync(path.join(dir, "specs/Ghi chú.md"), "utf8")).toBe("# exported 2");
    expect(readdirSync(dir)).toEqual(["specs"]);
  });

  it("upload trả tên thư mục; lỗi Google → mã lỗi STORAGE.*", async () => {
    const drive = new FakeDrive([]);
    const out = await new UploadDriveFileTask(async () => drive).run({ folderId: "f", name: "a.md", content: "x", asGoogleDoc: true });
    expect(out).toEqual({ fileId: "new", url: "https://drive/x", folderName: "Specs", created: false });
    expect(drive.uploads).toEqual([{ name: "a.md", asGoogleDoc: true }]);

    const seen: (readonly string[])[] = [];
    await new UploadDriveFileTask(async (refs) => (seen.push(refs), drive)).run({ workspaceId: "ws1", folderId: "f", name: "b.md", content: "x", asGoogleDoc: false });
    expect(seen).toEqual([["ws1:google_oauth", "google:oauth"]]);

    const fail = (kind: GoogleError["kind"]) => async () => Promise.reject(new GoogleError(kind));

    const up = { folderId: "f", name: "a.md", content: "x", asGoogleDoc: false };
    await expect(new UploadDriveFileTask(fail("NOT_CONFIGURED")).run(up)).rejects.toMatchObject({ code: "STORAGE.GOOGLE_NOT_CONFIGURED" });
    await expect(new UploadDriveFileTask(fail("UNAUTHORIZED")).run(up)).rejects.toMatchObject({ code: "STORAGE.GOOGLE_AUTH_REQUIRED" });
    await expect(new UploadDriveFileTask(fail("NOT_FOUND")).run(up)).rejects.toMatchObject({ code: "STORAGE.DRIVE_NOT_FOUND" });
    await expect(new UploadDriveFileTask(fail("FAILED")).run(up)).rejects.toMatchObject({ code: "STORAGE.DRIVE_REQUEST_FAILED" });
  });
});
