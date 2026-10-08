import "server-only";
import path from "node:path";
import { Action } from "@/ship/parents/Action";
import { ResolveGitCredentialsTask } from "../../Connector/Tasks/ResolveGitCredentialsTask";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { StorageConfigMissingException } from "../Exceptions/StorageConfigMissingException";
import { StorageNotSupportedException } from "../Exceptions/StorageNotSupportedException";
import type { PullResult } from "../Models/StorageResult";
import { DownloadDriveFolderTask } from "../Tasks/DownloadDriveFolderTask";
import { PullGitTask } from "../Tasks/PullGitTask";

/** Pull nhanh trên Header (spec 3.1, 5.4): Git → pull --ff-only; Drive → tải các file .md về thư mục spec. */
export class PullWorkspaceAction extends Action<{ workspaceId: string }, PullResult> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly resolveCredentials = new ResolveGitCredentialsTask(),
    private readonly pullGit = new PullGitTask(),
    private readonly downloadDrive = new DownloadDriveFolderTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<PullResult> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    if (!config) throw new StorageConfigMissingException();
    const { type, git, drive } = config.storage;

    if (type === "GIT" && git) {
      const creds = await this.resolveCredentials.run({ connectorId: git.connectorId, remote: git.remote });
      const { headSha, changedFiles } = await this.pullGit.run({ cwd: ws.path, remoteUrl: creds.remoteUrl, env: creds.env, branch: git.branch });
      return { storageType: type, files: changedFiles, headSha };
    }
    if (type === "DRIVE" && drive) {
      const { files } = await this.downloadDrive.run({ workspaceId, folderId: drive.folderId, targetDir: path.resolve(ws.path, ws.specs_dir) });
      return { storageType: type, files, headSha: null };
    }
    if (type === "LOCAL") throw new StorageNotSupportedException({ storageType: type });
    throw new StorageConfigMissingException({ storageType: type });
  }
}
