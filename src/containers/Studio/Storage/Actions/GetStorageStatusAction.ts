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
export class GetStorageStatusAction extends Action<{ workspaceId: string }, StorageStatus> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly gitStatus = new GetGitStatusTask(),
    private readonly listSpecs = new ListSpecFilesTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<StorageStatus> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    const storageType = config?.storage.type ?? ws.storage_type;
    const empty: StorageStatus = { storageType, branch: null, currentBranch: null, uncommitted: 0, ahead: null, behind: null, pendingFiles: 0 };

    const git = config?.storage.git;
    if (storageType === "GIT" && git) {
      const s = await this.gitStatus.run({ cwd: ws.path, branch: git.branch, paths: [path.resolve(ws.path, ws.specs_dir)] });
      return { ...empty, branch: git.branch, currentBranch: s.currentBranch, uncommitted: s.changed.length, ahead: s.ahead, behind: s.behind };
    }
    if (storageType === "DRIVE") {
      const files = await this.listSpecs.run({ workspaceId, location: specsLocationOf(ws) });
      return { ...empty, pendingFiles: files.filter((f) => f.syncStatus !== "SYNCED").length };
    }
    return empty;
  }
}
