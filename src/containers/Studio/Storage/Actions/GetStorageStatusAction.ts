import "server-only";
import path from "node:path";
import { Action } from "@/ship/parents/Action";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { specsLocationOf } from "../../Spec/Models/SpecFile";
import { ListSpecFilesTask } from "../../Spec/Tasks/ListSpecFilesTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import type { StorageStatus } from "../Models/StorageResult";
import { GetGitStatusTask } from "../Tasks/GetGitStatusTask";

/** Storage Status trên Header (spec 3.1): số thay đổi chưa commit / push (Git), file chưa đồng bộ (Drive). Không gọi mạng. */
export class GetStorageStatusAction extends Action<{ workspaceId: string }, { items: StorageStatus[] }> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly gitStatus = new GetGitStatusTask(),
    private readonly listSpecs = new ListSpecFilesTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<{ items: StorageStatus[] }> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    const items: StorageStatus[] = [];

    const git = config?.storage.git;
    if (git) {
      const s = await this.gitStatus.run({ cwd: ws.path, branch: git.branch, paths: [path.resolve(ws.path, ws.specs_dir)] });
      items.push({
        storageType: "GIT",
        branch: git.branch,
        currentBranch: s.currentBranch,
        uncommitted: s.changed.length,
        ahead: s.ahead,
        behind: s.behind,
        pendingFiles: 0,
      });
    }
    if (config?.storage.drive) {
      const files = await this.listSpecs.run({ workspaceId, location: specsLocationOf(ws) });
      items.push({
        storageType: "DRIVE",
        branch: null,
        currentBranch: null,
        uncommitted: 0,
        ahead: null,
        behind: null,
        pendingFiles: files.filter((f) => f.syncStatus !== "SYNCED").length,
      });
    }
    return { items };
  }
}
