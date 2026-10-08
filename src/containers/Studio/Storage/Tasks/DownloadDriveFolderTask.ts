import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDriveGateway, DRIVE_GOOGLE_DOC_MIME, type DriveGatewayFactory } from "@/ship/adapters/google";
import { Task } from "@/ship/parents/Task";
import { googleFailure } from "../Exceptions/mapFailures";
import { googleSecretRefs } from "../Models/googleSecret";

/**
 * Tải các file .md (và Google Doc, xuất ra Markdown) trong thư mục Drive về targetDir (luồng 6.3, Pull Drive).
 * Ghi đè file local cùng tên; tên không an toàn (chứa "/", "\", bắt đầu bằng ".") bị bỏ qua.
 * Token Google: secret GOOGLE_OAUTH của `workspaceId` (nếu truyền) rồi token dùng chung cả app.
 */
export type DownloadDriveFolderTaskInput = { folderId: string; targetDir: string; workspaceId?: string };
export type DownloadDriveFolderTaskOutput = { files: string[] };

const SAFE_NAME = /^[^/\\\u0000-\u001f.][^/\\\u0000-\u001f]*$/u;

/** Tên file local cho một mục Drive, hoặc undefined nếu không phải spec. */
export function localNameOf(item: { name: string; mimeType: string }): string | undefined {
  const name = item.name.trim();
  if (!SAFE_NAME.test(name) || name.length > 255) return undefined;
  if (item.mimeType === DRIVE_GOOGLE_DOC_MIME) return /\.md$/i.test(name) ? name : `${name}.md`;
  return /\.md$/i.test(name) ? name : undefined;
}

export class DownloadDriveFolderTask extends Task<DownloadDriveFolderTaskInput, DownloadDriveFolderTaskOutput> {
  constructor(private readonly drive: DriveGatewayFactory = createDriveGateway) {
    super();
  }

  async run({ folderId, targetDir, workspaceId }: DownloadDriveFolderTaskInput): Promise<DownloadDriveFolderTaskOutput> {
    try {
      const gateway = await this.drive(googleSecretRefs(workspaceId));
      const items = await gateway.listFolder(folderId);
      const root = path.resolve(targetDir);
      await mkdir(root, { recursive: true });
      const written = new Set<string>();
      for (const item of items) {
        const name = localNameOf(item);
        if (!name || written.has(name)) continue;
        const content = await gateway.readText(item);
        const abs = path.join(root, name);
        const tmp = path.join(root, `.${name}.${randomBytes(6).toString("hex")}.tmp`);
        try {
          await writeFile(tmp, content, "utf8");
          await rename(tmp, abs);
        } catch (err) {
          await rm(tmp, { force: true });
          throw err;
        }
        written.add(name);
      }
      return { files: [...written].sort() };
    } catch (err) {
      throw googleFailure(err);
    }
  }
}
