import "server-only";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { v7 as uuidv7 } from "uuid";
import { Task } from "@/ship/parents/Task";
import { WORKSPACE_CONFIG_FILE, WorkspaceConfig } from "../Models/WorkspaceConfig";

/** Ghi <workspacePath>/.spec-studio/config.json nguyên tử (file tạm rồi rename). Config không chứa secret. */
export class WriteWorkspaceConfigTask extends Task<{ workspacePath: string; config: WorkspaceConfig }, WorkspaceConfig> {
  async run({ workspacePath, config }: { workspacePath: string; config: WorkspaceConfig }): Promise<WorkspaceConfig> {
    const valid = WorkspaceConfig.parse(config);
    const file = path.join(workspacePath, WORKSPACE_CONFIG_FILE);
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${uuidv7()}.tmp`;
    try {
      await writeFile(tmp, JSON.stringify(valid, null, 2) + "\n", { mode: 0o644 });
      await rename(tmp, file);
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
    return valid;
  }
}
