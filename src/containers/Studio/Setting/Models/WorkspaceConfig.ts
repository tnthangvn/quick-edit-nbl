import { z } from "zod";
import { AgentMode, LlmProvider } from "@/ship/contracts/enums/agent";
import { GitProvider, PublishMode, SyncStrategy } from "@/ship/contracts/enums/sync";
import { GitBranchName, GitHost, GitRemoteUrl, RepoFullName, RepoSubdir, SpecsDir } from "./ConfigFields";

/**
 * Nội dung <workspacePath>/.spec-studio/config.json (spec 5.1). Nguồn sự thật của từng Workspace.
 * Không chứa secret (chỉ tham chiếu connectorId / secret ref).
 */
export const GitStorageConfig = z
  .object({
    provider: GitProvider,
    host: GitHost,
    connectorId: z.string().nullable(),
    repo: RepoFullName.nullable(),
    remote: GitRemoteUrl,
    branch: GitBranchName,
    subdir: RepoSubdir,
    publishMode: PublishMode,
    prBranchTemplate: z.string().min(1).max(255),
    autoCommit: z.boolean(),
    autoPush: z.boolean(),
    commitMessage: z.string().min(1).max(500),
    pullOnOpen: z.boolean(),
  })
  .meta({ id: "GitStorageConfig" });

export const DriveStorageConfig = z
  .object({
    folderId: z.string().regex(/^[\w-]+$/),
    pullOnOpen: z.boolean(),
    pushOnApprove: z.boolean(),
  })
  .meta({ id: "DriveStorageConfig" });

export const NotebookConfig = z
  .object({
    notebookId: z.string().nullable(),
    syncStrategy: SyncStrategy,
    driveFolderId: z.string().nullable(),
    autoSyncOnApprove: z.boolean(),
    confirmBeforeSync: z.boolean(),
  })
  .meta({ id: "NotebookConfig" });

/** Phần Workspace ghi đè cấu hình Agent chung (spec 5.1: "Workspace có thể ghi đè"). Field bỏ trống = dùng cấu hình chung. */
export const AgentSettingsOverride = z
  .object({
    activeMode: AgentMode.optional(),
    api: z
      .object({
        provider: LlmProvider.optional(),
        model: z.string().min(1).optional(),
        temperature: z.number().min(0).max(2).optional(),
        systemPrompt: z.string().optional(),
      })
      .optional(),
    cli: z.object({ activeProfileId: z.string().min(1).optional() }).optional(),
  })
  .meta({ id: "AgentSettingsOverride" });

export const WorkspaceConfig = z
  .object({
    version: z.literal(1),
    workspace: z.object({ id: z.string(), name: z.string().trim().min(1).max(100), specsDir: SpecsDir }),
    /** Local luôn ngầm định có; Git/Drive bật thêm độc lập, không loại trừ nhau. */
    storage: z.object({
      git: GitStorageConfig.nullable(),
      drive: DriveStorageConfig.nullable(),
    }),
    nbl: NotebookConfig,
    agent: AgentSettingsOverride.optional(),
  })
  .meta({ id: "WorkspaceConfig" });
export type WorkspaceConfig = z.infer<typeof WorkspaceConfig>;
export type GitStorageConfig = z.infer<typeof GitStorageConfig>;
export type DriveStorageConfig = z.infer<typeof DriveStorageConfig>;
export type NotebookConfig = z.infer<typeof NotebookConfig>;
export type AgentSettingsOverride = z.infer<typeof AgentSettingsOverride>;

export const WORKSPACE_CONFIG_FILE = ".spec-studio/config.json";

/** Mặc định khi người dùng chọn "Bỏ qua, kết nối sau" ở bước NotebookLM. */
export const DEFAULT_NOTEBOOK_CONFIG: NotebookConfig = {
  notebookId: null,
  syncStrategy: "DRIVE_SYNC",
  driveFolderId: null,
  autoSyncOnApprove: false,
  confirmBeforeSync: true,
};

/** Nhãn hiển thị ở registry: ghép nhãn từng storage đang bật ("owner/repo@branch", folderId); null nếu chỉ Local. */
export function storageLabelOf(config: WorkspaceConfig): string | null {
  const { git, drive } = config.storage;
  const labels: string[] = [];
  if (git) labels.push(`${git.repo ?? git.remote.replace(/\.git$/, "").split(/[/:]/).slice(-2).join("/")}@${git.branch}`);
  if (drive) labels.push(drive.folderId);
  return labels.length ? labels.join(" + ") : null;
}

/** CSV cột `storage_type` của registry (luôn bắt đầu "LOCAL"), dùng để lọc/hiển thị theo loại storage đang bật. */
export function storageTypesOf(storage: WorkspaceConfig["storage"]): string {
  const types = ["LOCAL"];
  if (storage.git) types.push("GIT");
  if (storage.drive) types.push("DRIVE");
  return types.join(",");
}
