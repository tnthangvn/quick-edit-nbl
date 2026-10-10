import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { ATTACHMENTS_DIR, type CliImage } from "../Models/Sandbox";

/** Ghi ảnh đính kèm (base64) vào `<sandbox.dir>/.attachments/` theo đường dẫn đã tính sẵn (`attachmentPaths`). */
export class WriteCliAttachmentsTask extends Task<{ dir: string; images: readonly CliImage[]; paths: readonly string[] }, void> {
  async run({ dir, images, paths }: { dir: string; images: readonly CliImage[]; paths: readonly string[] }): Promise<void> {
    if (images.length === 0) return;
    await mkdir(path.join(dir, ATTACHMENTS_DIR), { recursive: true });
    await Promise.all(images.map((img, i) => writeFile(path.join(dir, paths[i]), Buffer.from(img.data, "base64"), { mode: 0o600 })));
  }
}
