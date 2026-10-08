import "server-only";
import { constants } from "node:fs";
import { access, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { WORKSPACE_CONFIG_FILE } from "../../Setting/Models/WorkspaceConfig";
import { WorkspaceConfigExistsException } from "../Exceptions/WorkspaceConfigExistsException";
import { WorkspaceFolderNotEmptyException } from "../Exceptions/WorkspaceFolderNotEmptyException";
import { WorkspaceFolderNotWritableException } from "../Exceptions/WorkspaceFolderNotWritableException";

/**
 * Chuẩn bị thư mục làm việc trước khi tạo Workspace:
 * - WORKING_DIR (Local / Drive): tạo nếu chưa có, phải ghi được và chưa có .spec-studio/config.json.
 * - CLONE_TARGET (Git): thư mục chưa tồn tại hoặc trống; thư mục cha được tạo và phải ghi được.
 */
export type PrepareWorkspaceFolderInput = { path: string; mode: "WORKING_DIR" | "CLONE_TARGET" };

export class PrepareWorkspaceFolderTask extends Task<PrepareWorkspaceFolderInput, void> {
  async run({ path: dir, mode }: PrepareWorkspaceFolderInput): Promise<void> {
    const existing = await stat(dir).catch(() => undefined);
    if (existing && !existing.isDirectory()) throw new WorkspaceFolderNotWritableException({ path: dir });

    if (mode === "CLONE_TARGET") {
      if (existing && (await readdir(dir)).length > 0) throw new WorkspaceFolderNotEmptyException({ path: dir });
      await this.ensureWritable(existing ? dir : path.dirname(dir));
      return;
    }

    await this.ensureWritable(dir);
    const hasConfig = await access(path.join(dir, WORKSPACE_CONFIG_FILE)).then(
      () => true,
      () => false,
    );
    if (hasConfig) throw new WorkspaceConfigExistsException({ path: dir });
  }

  private async ensureWritable(dir: string) {
    try {
      await mkdir(dir, { recursive: true });
      await access(dir, constants.W_OK);
    } catch (err) {
      throw new WorkspaceFolderNotWritableException({ path: dir }, { cause: err });
    }
  }
}
