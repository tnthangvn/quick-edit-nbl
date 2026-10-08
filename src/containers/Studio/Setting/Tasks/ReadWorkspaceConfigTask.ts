import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { WorkspaceConfigInvalidException } from "../../Workspace/Exceptions/WorkspaceConfigInvalidException";
import { WORKSPACE_CONFIG_FILE, WorkspaceConfig } from "../Models/WorkspaceConfig";

/** Đọc + validate <workspacePath>/.spec-studio/config.json. Thiếu file → undefined; sai định dạng → WORKSPACE.CONFIG_INVALID. */
export class ReadWorkspaceConfigTask extends Task<{ workspacePath: string }, WorkspaceConfig | undefined> {
  async run({ workspacePath }: { workspacePath: string }): Promise<WorkspaceConfig | undefined> {
    let raw: string;
    try {
      raw = await readFile(path.join(workspacePath, WORKSPACE_CONFIG_FILE), "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") return undefined;
      throw err;
    }
    try {
      return WorkspaceConfig.parse(JSON.parse(raw));
    } catch (err) {
      throw new WorkspaceConfigInvalidException(undefined, { cause: err });
    }
  }
}
