import "server-only";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { logger } from "@/ship/adapters/logger";
import { Task } from "@/ship/parents/Task";
import { SANDBOX_PREFIX } from "../Models/Sandbox";

/** Xoá thư mục tạm của run. Chỉ xoá trong os.tmpdir() để không bao giờ xoá nhầm thư mục thật. */
export class RemoveSandboxTask extends Task<{ root: string }> {
  async run({ root }: { root: string }): Promise<void> {
    const tmp = path.resolve(os.tmpdir());
    const target = path.resolve(root);
    if (!target.startsWith(tmp + path.sep) || !path.basename(target).startsWith(SANDBOX_PREFIX)) {
      logger.error({ root }, "từ chối xoá thư mục ngoài sandbox");
      return;
    }
    await rm(target, { recursive: true, force: true }).catch((err) => logger.warn({ err, root }, "không xoá được sandbox"));
  }
}
