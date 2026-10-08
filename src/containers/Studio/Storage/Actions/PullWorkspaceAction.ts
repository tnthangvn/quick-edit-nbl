import "server-only";
import path from "node:path";
import { Action } from "@/ship/parents/Action";
import { ResolveGitCredentialsTask } from "../../Connector/Tasks/ResolveGitCredentialsTask";
import type { DriveStorageConfig, GitStorageConfig } from "../../Setting/Models/WorkspaceConfig";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import type { WorkspaceRow } from "../../Workspace/Models/Workspace";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { StorageConfigMissingException } from "../Exceptions/StorageConfigMissingException";
import { StorageNotSupportedException } from "../Exceptions/StorageNotSupportedException";
import type { PullResult } from "../Models/StorageResult";
import { DownloadDriveFolderTask } from "../Tasks/DownloadDriveFolderTask";
import { PullGitTask } from "../Tasks/PullGitTask";

/**
 * Pull nhanh trên Header (spec 3.1, 5.4): Git → pull --ff-only; Drive → tải các file .md về thư mục spec. Chạy tuần
 * tự Git rồi Drive nếu cả hai đang bật.
 */
export class PullWorkspaceAction extends Action<{ workspaceId: string }, { items: PullResult[] }> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly resolveCredentials = new ResolveGitCredentialsTask(),
    private readonly pullGit = new PullGitTask(),
    private readonly downloadDrive = new DownloadDriveFolderTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<{ items: PullResult[] }> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    if (!config) throw new StorageConfigMissingException();
    const { git, drive } = config.storage;
    if (!git && !drive) throw new StorageNotSupportedException();

    const items: PullResult[] = [];
    if (git) items.push(await this.pullGitStorage(ws, git));
    if (drive) items.push(await this.pullDriveStorage(workspaceId, ws, drive));
    return { items };
  }

  private async pullGitStorage(ws: WorkspaceRow, git: GitStorageConfig): Promise<PullResult> {
    const creds = await this.resolveCredentials.run({ connectorId: git.connectorId, remote: git.remote });
    const { headSha, changedFiles } = await this.pullGit.run({ cwd: ws.path, remoteUrl: creds.remoteUrl, env: creds.env, branch: git.branch });
    return { storageType: "GIT", files: changedFiles, headSha };
  }

  private async pullDriveStorage(workspaceId: string, ws: WorkspaceRow, drive: DriveStorageConfig): Promise<PullResult> {
    const { files } = await this.downloadDrive.run({ workspaceId, folderId: drive.folderId, targetDir: path.resolve(ws.path, ws.specs_dir) });
    return { storageType: "DRIVE", files, headSha: null };
  }
}
