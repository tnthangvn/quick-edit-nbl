import "server-only";
import { logger } from "@/ship/adapters/logger";
import type { ErrorCode, ErrorParams } from "@/ship/contracts/errors";
import { AppException } from "@/ship/parents/AppException";
import { Action } from "@/ship/parents/Action";
import { CheckGitRemoteTask } from "../../Connector/Tasks/CheckGitRemoteTask";
import { ResolveGitCredentialsTask } from "../../Connector/Tasks/ResolveGitCredentialsTask";
import { CheckNotebookTask } from "../../Notebook/Tasks/CheckNotebookTask";
import type { WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import type { WorkspaceCheckStatus, WorkspaceCheckTarget } from "../Enums/WorkspaceCheck";
import { GetWorkspaceTask } from "../Tasks/GetWorkspaceTask";
import { CheckDriveAccessTask } from "../Tasks/CheckDriveAccessTask";
import { InspectFolderTask } from "../Tasks/InspectFolderTask";

type Info = Record<string, string | number | boolean>;
export type WorkspaceCheckItem = {
  target: WorkspaceCheckTarget;
  status: WorkspaceCheckStatus;
  error: { code: ErrorCode; params?: ErrorParams } | null;
  /** Dữ liệu hiển thị kèm (headSha, folderName, sourceCount...), không phải câu thông báo. */
  info: Info | null;
};

const ok = (target: WorkspaceCheckTarget, info: Info | null = null): WorkspaceCheckItem => ({ target, status: "OK", error: null, info });
const skipped = (target: WorkspaceCheckTarget): WorkspaceCheckItem => ({ target, status: "SKIPPED", error: null, info: null });
const failed = (target: WorkspaceCheckTarget, code: ErrorCode, params?: ErrorParams): WorkspaceCheckItem => ({
  target,
  status: "ERROR",
  error: params ? { code, params } : { code },
  info: null,
});

/**
 * Nút Kiểm tra Workspace (spec 5.4): thư mục, Git remote (ls-remote qua connector), quyền Drive, Notebook.
 * Mỗi mục độc lập: một mục lỗi không chặn mục khác; mục không cấu hình → SKIPPED.
 */
export class CheckWorkspaceAction extends Action<{ workspaceId: string }, WorkspaceCheckItem[]> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly inspectFolder = new InspectFolderTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly resolveGitCredentials = new ResolveGitCredentialsTask(),
    private readonly checkGitRemote = new CheckGitRemoteTask(),
    private readonly checkDriveAccess = new CheckDriveAccessTask(),
    private readonly checkNotebook = new CheckNotebookTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<WorkspaceCheckItem[]> {
    const workspace = await this.getWorkspace.run({ workspaceId });
    const { item: folderItem, config } = await this.checkFolder(workspace.path);
    const [git, drive, notebook] = await Promise.all([
      this.guard("GIT_REMOTE", () => this.checkGit(config)),
      this.guard("DRIVE", () => this.checkDrive(workspaceId, config)),
      this.guard("NOTEBOOK", () => this.checkNotebookItem(workspaceId, config)),
    ]);
    return [folderItem, git, drive, notebook];
  }

  private async checkFolder(path: string): Promise<{ item: WorkspaceCheckItem; config: WorkspaceConfig | undefined }> {
    const folder = await this.inspectFolder.run({ path });
    if (!folder.isDirectory) return { item: failed("FOLDER", "WORKSPACE.FOLDER_NOT_FOUND", { path }), config: undefined };
    if (!folder.writable) return { item: failed("FOLDER", "WORKSPACE.FOLDER_NOT_WRITABLE", { path }), config: undefined };
    try {
      const config = await this.readConfig.run({ workspacePath: path });
      if (!config) return { item: failed("FOLDER", "WORKSPACE.CONFIG_NOT_FOUND", { path }), config: undefined };
      return { item: ok("FOLDER"), config };
    } catch (err) {
      return { item: this.toFailure("FOLDER", err), config: undefined };
    }
  }

  private async checkGit(config: WorkspaceConfig | undefined): Promise<WorkspaceCheckItem> {
    const git = config?.storage.type === "GIT" ? config.storage.git : null;
    if (!git) return skipped("GIT_REMOTE");
    const { env, remoteUrl } = await this.resolveGitCredentials.run({ connectorId: git.connectorId, remote: git.remote });
    const r = await this.checkGitRemote.run({ remoteUrl, branch: git.branch, env });
    if (!r.reachable) return failed("GIT_REMOTE", "WORKSPACE.GIT_REMOTE_UNREACHABLE", { exitCode: r.exitCode });
    if (!r.branchFound) return failed("GIT_REMOTE", "WORKSPACE.GIT_BRANCH_NOT_FOUND", { branch: git.branch });
    return ok("GIT_REMOTE", { branch: git.branch, headSha: r.headSha ?? "" });
  }

  private async checkDrive(workspaceId: string, config: WorkspaceConfig | undefined): Promise<WorkspaceCheckItem> {
    const folderId =
      (config?.storage.type === "DRIVE" ? config.storage.drive?.folderId : undefined) ??
      (config?.nbl.syncStrategy === "DRIVE_SYNC" ? config.nbl.driveFolderId : null);
    if (!folderId) return skipped("DRIVE");
    const { folderName } = await this.checkDriveAccess.run({ workspaceId, folderId });
    return ok("DRIVE", { folderId, folderName });
  }

  private async checkNotebookItem(workspaceId: string, config: WorkspaceConfig | undefined): Promise<WorkspaceCheckItem> {
    const notebookId = config?.nbl.notebookId;
    if (!config || !notebookId) return skipped("NOTEBOOK");
    const r = await this.checkNotebook.run({ notebookId, syncStrategy: config.nbl.syncStrategy, workspaceId });
    if (!r.ok) return failed("NOTEBOOK", "WORKSPACE.NOTEBOOK_UNREACHABLE", { notebookId });
    const info: Info = { notebookId };
    if (r.title !== null) info.title = r.title;
    if (r.sourceCount !== null) info.sourceCount = r.sourceCount;
    return ok("NOTEBOOK", info);
  }

  private async guard(target: WorkspaceCheckTarget, fn: () => Promise<WorkspaceCheckItem>): Promise<WorkspaceCheckItem> {
    try {
      return await fn();
    } catch (err) {
      return this.toFailure(target, err);
    }
  }

  private toFailure(target: WorkspaceCheckTarget, err: unknown): WorkspaceCheckItem {
    if (err instanceof AppException) return failed(target, err.code, err.params);
    logger.error({ err, target }, "workspace check failed");
    return failed(target, "INTERNAL.UNEXPECTED");
  }
}
