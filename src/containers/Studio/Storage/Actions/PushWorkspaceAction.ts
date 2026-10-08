import "server-only";
import path from "node:path";
import { Action } from "@/ship/parents/Action";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { specsLocationOf } from "../../Spec/Models/SpecFile";
import { ListSpecFilesTask } from "../../Spec/Tasks/ListSpecFilesTask";
import { ReadSpecFileTask } from "../../Spec/Tasks/ReadSpecFileTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { StorageConfigMissingException } from "../Exceptions/StorageConfigMissingException";
import { StorageNotSupportedException } from "../Exceptions/StorageNotSupportedException";
import { sharesDriveFolder, type PushResult } from "../Models/StorageResult";
import { PublishGitChangesSubAction } from "../SubActions/PublishGitChangesSubAction";
import { GetGitStatusTask } from "../Tasks/GetGitStatusTask";
import { UploadDriveFileTask } from "../Tasks/UploadDriveFileTask";

/**
 * Push nhanh trên Header (spec 3.1, 5.4, tool publish_specs): Git → commit mọi thay đổi trong thư mục spec rồi push
 * hoặc đẩy branch + tạo/cập nhật PR theo publishMode; Drive → tải mọi file spec lên (ghi đè).
 */
export class PushWorkspaceAction extends Action<{ workspaceId: string }, PushResult> {
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

  async run({ workspaceId }: { workspaceId: string }): Promise<PushResult> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    if (!config) throw new StorageConfigMissingException();
    const { type, git, drive } = config.storage;
    const specsDir = path.resolve(ws.path, ws.specs_dir);

    if (type === "GIT" && git) {
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
        storageType: type,
        files: files.map((f) => path.relative(specsDir, f).split(path.sep).join("/")),
        branch: result.branch,
        commitSha: result.sha,
        pushed: result.pushed,
        pullRequest: result.pullRequest && { number: result.pullRequest.number, url: result.pullRequest.url },
      };
    }

    if (type === "DRIVE" && drive) {
      const location = specsLocationOf(ws);
      const asGoogleDoc = sharesDriveFolder(config);
      const uploaded: string[] = [];
      for (const { file } of await this.listSpecs.run({ workspaceId, location })) {
        const { content } = await this.readSpec.run({ workspaceId, location, file });
        await this.uploadDrive.run({ workspaceId, folderId: drive.folderId, name: file, content, asGoogleDoc });
        uploaded.push(file);
      }
      return { storageType: type, files: uploaded, branch: null, commitSha: null, pushed: uploaded.length > 0, pullRequest: null };
    }

    if (type === "LOCAL") throw new StorageNotSupportedException({ storageType: type });
    throw new StorageConfigMissingException({ storageType: type });
  }
}
