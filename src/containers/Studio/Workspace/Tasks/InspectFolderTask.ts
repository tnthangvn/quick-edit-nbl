import "server-only";
import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { WORKSPACE_CONFIG_FILE } from "../../Setting/Models/WorkspaceConfig";

export type FolderInfo = { exists: boolean; isDirectory: boolean; writable: boolean; empty: boolean; hasConfig: boolean };

/** Trạng thái một thư mục trên đĩa: có tồn tại, ghi được, trống, đã có .spec-studio/config.json. */
export class InspectFolderTask extends Task<{ path: string }, FolderInfo> {
  async run({ path: dir }: { path: string }): Promise<FolderInfo> {
    const info = await stat(dir).catch(() => undefined);
    if (!info?.isDirectory()) return { exists: !!info, isDirectory: false, writable: false, empty: false, hasConfig: false };
    const [writable, entries, hasConfig] = await Promise.all([
      access(dir, constants.W_OK).then(
        () => true,
        () => false,
      ),
      readdir(dir).catch(() => [] as string[]),
      access(path.join(dir, WORKSPACE_CONFIG_FILE)).then(
        () => true,
        () => false,
      ),
    ]);
    return { exists: true, isDirectory: true, writable, empty: entries.length === 0, hasConfig };
  }
}
