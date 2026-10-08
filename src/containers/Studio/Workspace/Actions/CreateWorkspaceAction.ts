import "server-only";
import { v7 as uuidv7 } from "uuid";
import { DEFAULT_GIT_HOSTS } from "@/ship/adapters/git-providers";
import { AppException } from "@/ship/parents/AppException";
import { Action } from "@/ship/parents/Action";
import { ResolveGitCredentialsTask } from "../../Connector/Tasks/ResolveGitCredentialsTask";
import { extractDriveFolderId, extractNotebookId } from "../../Setting/Models/ConfigFields";
import {
  DEFAULT_NOTEBOOK_CONFIG,
  storageLabelOf,
  type GitStorageConfig,
  type NotebookConfig,
  type WorkspaceConfig,
} from "../../Setting/Models/WorkspaceConfig";
import { WriteWorkspaceConfigTask } from "../../Setting/Tasks/WriteWorkspaceConfigTask";
import { CloneRepositoryTask } from "../../Storage/Tasks/CloneRepositoryTask";
import { DownloadDriveFolderTask } from "../../Storage/Tasks/DownloadDriveFolderTask";
import { WorkspaceCloneFailedException } from "../Exceptions/WorkspaceCloneFailedException";
import { WorkspaceDriveDownloadFailedException } from "../Exceptions/WorkspaceDriveDownloadFailedException";
import type { WorkspaceRow } from "../Models/Workspace";
import { AddGitignoreEntryTask } from "../Tasks/AddGitignoreEntryTask";
import { AssertWorkspaceUniqueTask } from "../Tasks/AssertWorkspaceUniqueTask";
import { CreateSpecsDirTask } from "../Tasks/CreateSpecsDirTask";
import { CreateWorkspaceRecordTask } from "../Tasks/CreateWorkspaceRecordTask";
import { PrepareWorkspaceFolderTask } from "../Tasks/PrepareWorkspaceFolderTask";

/** Git ở Wizard: host / remote có thể bỏ trống (suy ra từ provider + repo). */
export type GitStorageInput = Omit<GitStorageConfig, "host" | "remote"> & { host?: string; remote?: string };

export type CreateWorkspaceInput = {
  name: string;
  description: string | null;
  /** Đường dẫn tuyệt đối đã chuẩn hoá. */
  path: string;
  specsDir: string;
  storage:
    | { type: "LOCAL" }
    | { type: "GIT"; git: GitStorageInput; /** true = commit cả .spec-studio/ lên repo */ shareConfig: boolean }
    | { type: "DRIVE"; drive: { folderId: string; pullOnOpen: boolean; pushOnApprove: boolean } };
  /** null = "Bỏ qua, kết nối sau". */
  notebook: NotebookConfig | null;
};

const SPEC_STUDIO_DIR_ENTRY = ".spec-studio/";

/**
 * Wizard + New Project (spec 3.0.1, luồng 6.3): chuẩn bị thư mục → tạo / clone / tải Drive → ghi config.json →
 * thêm vào registry. Lỗi ở bước nào thì dừng ở bước đó (registry chỉ ghi ở bước cuối).
 */
export class CreateWorkspaceAction extends Action<CreateWorkspaceInput, WorkspaceRow> {
  constructor(
    private readonly assertUnique = new AssertWorkspaceUniqueTask(),
    private readonly prepareFolder = new PrepareWorkspaceFolderTask(),
    private readonly resolveGitCredentials = new ResolveGitCredentialsTask(),
    private readonly cloneRepository = new CloneRepositoryTask(),
    private readonly downloadDriveFolder = new DownloadDriveFolderTask(),
    private readonly addGitignoreEntry = new AddGitignoreEntryTask(),
    private readonly createSpecsDir = new CreateSpecsDirTask(),
    private readonly writeConfig = new WriteWorkspaceConfigTask(),
    private readonly createRecord = new CreateWorkspaceRecordTask(),
  ) {
    super();
  }

  async run(input: CreateWorkspaceInput): Promise<WorkspaceRow> {
    await this.assertUnique.run({ name: input.name, path: input.path });
    const id = uuidv7();
    const storage = await this.prepareStorage(input);

    await this.createSpecsDir.run({ workspacePath: input.path, specsDir: input.specsDir });
    const notebook = input.notebook
      ? {
          ...input.notebook,
          notebookId: input.notebook.notebookId ? extractNotebookId(input.notebook.notebookId) : null,
          driveFolderId: input.notebook.driveFolderId ? extractDriveFolderId(input.notebook.driveFolderId) : null,
        }
      : DEFAULT_NOTEBOOK_CONFIG;
    const config = await this.writeConfig.run({
      workspacePath: input.path,
      config: { version: 1, workspace: { id, name: input.name, specsDir: input.specsDir }, storage, nbl: notebook },
    });

    return this.createRecord.run({
      id,
      name: input.name,
      description: input.description,
      path: input.path,
      specs_dir: input.specsDir,
      storage_type: storage.type,
      storage_label: storageLabelOf(config),
      notebook_id: notebook.notebookId,
      status: "ACTIVE",
      last_opened_at: null,
    });
  }

  private async prepareStorage(input: CreateWorkspaceInput): Promise<WorkspaceConfig["storage"]> {
    const { storage } = input;
    switch (storage.type) {
      case "LOCAL":
        await this.prepareFolder.run({ path: input.path, mode: "WORKING_DIR" });
        return { type: "LOCAL", git: null, drive: null };

      case "DRIVE": {
        await this.prepareFolder.run({ path: input.path, mode: "WORKING_DIR" });
        const folderId = extractDriveFolderId(storage.drive.folderId) ?? storage.drive.folderId;
        const targetDir = await this.createSpecsDir.run({ workspacePath: input.path, specsDir: input.specsDir });
        await wrap(() => this.downloadDriveFolder.run({ folderId, targetDir }), (cause) => new WorkspaceDriveDownloadFailedException(undefined, { cause }));
        return { type: "DRIVE", git: null, drive: { ...storage.drive, folderId } };
      }

      case "GIT": {
        const git = this.completeGit(storage.git);
        await this.prepareFolder.run({ path: input.path, mode: "CLONE_TARGET" });
        const { env, remoteUrl } = await this.resolveGitCredentials.run({ connectorId: git.connectorId, remote: git.remote });
        await wrap(
          () => this.cloneRepository.run({ remoteUrl, branch: git.branch, targetPath: input.path, env }),
          (cause) => new WorkspaceCloneFailedException(undefined, { cause }),
        );
        if (!storage.shareConfig) await this.addGitignoreEntry.run({ repoPath: input.path, entry: SPEC_STUDIO_DIR_ENTRY });
        return { type: "GIT", git, drive: null };
      }
    }
  }

  /** Host mặc định theo provider; remote suy ra https://<host>/<repo>.git khi chọn repo từ connector. */
  private completeGit({ host, remote, ...git }: GitStorageInput): GitStorageConfig {
    const effectiveHost = host ?? (git.provider === "GENERIC" ? undefined : DEFAULT_GIT_HOSTS[git.provider]) ?? "";
    return { ...git, host: effectiveHost, remote: remote ?? `https://${effectiveHost}/${git.repo}.git` };
  }
}

/** Lỗi nghiệp vụ (đã có mã) giữ nguyên; lỗi khác bọc thành mã của bước đang chạy. */
async function wrap<T>(fn: () => Promise<T>, toError: (cause: unknown) => AppException): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw err instanceof AppException ? err : toError(err);
  }
}
