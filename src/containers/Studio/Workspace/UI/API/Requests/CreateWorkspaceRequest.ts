import { z } from "zod";
import { GitProvider, PublishMode, SyncStrategy } from "@/ship/contracts/enums/sync";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import {
  AbsolutePath,
  DriveFolderIdField,
  GitBranchName,
  GitHost,
  GitRemoteUrl,
  NotebookIdField,
  RepoFullName,
  RepoSubdir,
  SpecsDir,
} from "../../../../Setting/Models/ConfigFields";
import { WorkspaceResponse } from "../Transformers/WorkspaceTransformer";
import { WorkspaceDescription, WorkspaceName } from "./workspaceFields";

const GitStorageInput = z
  .object({
    provider: GitProvider,
    host: GitHost.optional().meta({ description: "Bỏ trống = host mặc định của provider (github.com, gitlab.com, bitbucket.org)" }),
    connectorId: z.string().min(1).max(64).nullable().default(null),
    repo: RepoFullName.nullable().default(null),
    remote: GitRemoteUrl.optional().meta({ description: "Bỏ trống khi đã chọn repo qua connector (suy ra https://<host>/<repo>.git)" }),
    branch: GitBranchName.default("main"),
    subdir: RepoSubdir.default("").meta({ description: "Thư mục con trong repo chứa spec; để trống = gốc repo" }),
    publishMode: PublishMode.default("PUSH"),
    prBranchTemplate: z.string().trim().min(1).max(255).default("spec/{date}-{filename}"),
    autoCommit: z.boolean().default(true),
    autoPush: z.boolean().default(false),
    commitMessage: z.string().trim().min(1).max(500).default("docs(spec): {action} {filename}"),
    pullOnOpen: z.boolean().default(true),
  })
  .superRefine((g, ctx) => {
    if (!g.host && (g.provider === "GITEA" || g.provider === "GENERIC") && !g.remote) {
      ctx.addIssue({ code: "custom", path: ["host"], message: "FIELD.REQUIRED" });
    }
    if (!g.remote && !g.repo) ctx.addIssue({ code: "custom", path: ["remote"], message: "FIELD.REQUIRED" });
  })
  .meta({ id: "GitStorageInput" });

const NotebookInput = z
  .object({
    notebookId: NotebookIdField.nullable().default(null).meta({ description: "Notebook ID hoặc URL notebook (tự tách ID)" }),
    syncStrategy: SyncStrategy.default("DRIVE_SYNC"),
    driveFolderId: DriveFolderIdField.nullable().default(null),
    autoSyncOnApprove: z.boolean().default(false),
    confirmBeforeSync: z.boolean().default(true),
  })
  .meta({ id: "NotebookInput" });

export const CreateWorkspaceBody = z
  .object({
    name: WorkspaceName,
    description: WorkspaceDescription.default(null),
    path: AbsolutePath.meta({ description: "Thư mục làm việc local (workspacePath), đường dẫn tuyệt đối" }),
    specsDir: SpecsDir.default("").meta({ description: "Thư mục con chứa spec; để trống = gốc workspace" }),
    /** Local luôn ngầm định có; Git/Drive bật thêm độc lập, không loại trừ nhau. */
    storage: z
      .object({
        git: GitStorageInput.nullable().default(null),
        drive: z
          .object({
            folderId: DriveFolderIdField.meta({ description: "Drive Folder ID hoặc URL thư mục" }),
            pullOnOpen: z.boolean().default(true),
            pushOnApprove: z.boolean().default(true),
          })
          .nullable()
          .default(null),
        shareConfig: z.boolean().default(false).meta({ description: "true = không thêm .spec-studio/ vào .gitignore (chỉ áp dụng khi bật Git)" }),
      })
      .meta({ id: "CreateWorkspaceStorageInput" }),
    notebook: NotebookInput.nullable().default(null).meta({ description: "null = Bỏ qua, kết nối sau" }),
  })
  .meta({ id: "CreateWorkspaceInput" });

export const createWorkspaceContract = defineContract({
  request: { body: CreateWorkspaceBody },
  responses: { 201: WorkspaceResponse, 400: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse, 502: ErrorResponse },
});
