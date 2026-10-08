import "server-only";
import path from "node:path";
import { Action } from "@/ship/parents/Action";
import type { DriveStorageConfig, GitStorageConfig, WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { specsLocationOf } from "../../Spec/Models/SpecFile";
import { ListSpecFilesTask } from "../../Spec/Tasks/ListSpecFilesTask";
import { ReadSpecFileTask } from "../../Spec/Tasks/ReadSpecFileTask";
import type { WorkspaceRow } from "../../Workspace/Models/Workspace";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { StorageConfigMissingException } from "../Exceptions/StorageConfigMissingException";
import { StorageNotSupportedException } from "../Exceptions/StorageNotSupportedException";
import { sharesDriveFolder, type PushResult } from "../Models/StorageResult";
import { PublishGitChangesSubAction } from "../SubActions/PublishGitChangesSubAction";
import { GetGitStatusTask } from "../Tasks/GetGitStatusTask";
import { UploadDriveFileTask } from "../Tasks/UploadDriveFileTask";

/**
 * Push nhanh trên Header (spec 3.1, 5.4, tool publish_specs): Git → commit mọi thay đổi trong thư mục spec rồi push
 * hoặc đẩy branch + tạo/cập nhật PR theo publishMode; Drive → tải mọi file spec lên (ghi đè). Chạy tuần tự Git rồi
 * Drive nếu cả hai đang bật.
 */
export class PushWorkspaceAction extends Action<{ workspaceId: string }, { items: PushResult[] }> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly gitStatus = new GetGitStatusTask(),
    private readonly publishGit = new PublishGitChangesSubAction(),
    private readonly listSpecs = new ListSpecFilesTask(),
    private readonly readSpec = new ReadSpecFileTask(),
    private readonly uploadDrive = new UploadDriveFileTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<{ items: PushResult[] }> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    if (!config) throw new StorageConfigMissingException();
    const { git, drive } = config.storage;
    if (!git && !drive) throw new StorageNotSupportedException();

    const items: PushResult[] = [];
    if (git) items.push(await this.pushGit(ws, git));
    if (drive) items.push(await this.pushDrive(workspaceId, ws, config, drive));
    return { items };
  }

  private async pushGit(ws: WorkspaceRow, git: GitStorageConfig): Promise<PushResult> {
    const specsDir = path.resolve(ws.path, ws.specs_dir);
    const { changed } = await this.gitStatus.run({ cwd: ws.path, branch: git.branch, paths: [specsDir] });
    const files = changed.map((c) => c.path);
    const result = await this.publishGit.run({
      workspacePath: ws.path,
      git,
      files: files.length ? files : [specsDir],
      action: "update",
      filename: files.length === 1 ? path.basename(files[0]) : "specs",
      push: true,
    });
    return {
      storageType: "GIT",
      files: files.map((f) => path.relative(specsDir, f).split(path.sep).join("/")),
      branch: result.branch,
      commitSha: result.sha,
      pushed: result.pushed,
      pullRequest: result.pullRequest && { number: result.pullRequest.number, url: result.pullRequest.url },
    };
  }

  private async pushDrive(workspaceId: string, ws: WorkspaceRow, config: WorkspaceConfig, drive: DriveStorageConfig): Promise<PushResult> {
    const location = specsLocationOf(ws);
    const asGoogleDoc = sharesDriveFolder(config);
    const uploaded: string[] = [];
    for (const { file } of await this.listSpecs.run({ workspaceId, location })) {
      const { content } = await this.readSpec.run({ workspaceId, location, file });
      await this.uploadDrive.run({ workspaceId, folderId: drive.folderId, name: file, content, asGoogleDoc });
      uploaded.push(file);
    }
    return { storageType: "DRIVE", files: uploaded, branch: null, commitSha: null, pushed: uploaded.length > 0, pullRequest: null };
  }
}
