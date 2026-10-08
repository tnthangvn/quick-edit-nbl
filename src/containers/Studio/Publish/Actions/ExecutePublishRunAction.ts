import "server-only";
import { logger } from "@/ship/adapters/logger";
import { NOTEBOOK_URL } from "@/ship/adapters/nlm";
import type { PublishTarget } from "@/ship/contracts/enums/sync";
import type { PublishStep } from "@/ship/contracts/events";
import { Action } from "@/ship/parents/Action";
import { AppException } from "@/ship/parents/AppException";
import { NotebookNotConfiguredException } from "../../Notebook/Exceptions/NotebookNotConfiguredException";
import { RefreshNotebookDriveSourceTask } from "../../Notebook/Tasks/RefreshNotebookDriveSourceTask";
import { ReplaceNotebookTextSourceTask } from "../../Notebook/Tasks/ReplaceNotebookTextSourceTask";
import type { WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { specsLocationOf, type SpecsLocation } from "../../Spec/Models/SpecFile";
import { GetSpecFileInfoTask } from "../../Spec/Tasks/GetSpecFileInfoTask";
import { ReadSpecFileTask } from "../../Spec/Tasks/ReadSpecFileTask";
import { RecordSpecChangeTask } from "../../Spec/Tasks/RecordSpecChangeTask";
import { sharesDriveFolder } from "../../Storage/Models/StorageResult";
import { PublishGitChangesSubAction } from "../../Storage/SubActions/PublishGitChangesSubAction";
import { UploadDriveFileTask } from "../../Storage/Tasks/UploadDriveFileTask";
import type { WorkspaceRow } from "../../Workspace/Models/Workspace";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import type { PublishRun } from "../Models/PublishRun";
import { FinishPublishRunTask } from "../Tasks/FinishPublishRunTask";
import { GetPublishRunTask } from "../Tasks/GetPublishRunTask";
import { UpdatePublishStepTask } from "../Tasks/UpdatePublishStepTask";

type StepResult = { detail: string; url: string | null };
/** Kết quả dùng lại giữa các bước trong cùng lần chạy (gộp Drive storage + Drive Sync). */
type RunContext = { ws: WorkspaceRow; config: WorkspaceConfig | undefined; location: SpecsLocation; googleDocId?: string };

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const stepError = (err: unknown): PublishStep["error"] =>
  err instanceof AppException ? { code: err.code, params: err.params } : { code: "INTERNAL.UNEXPECTED" };

/**
 * Chạy một lần pipeline 6.4 (gọi từ handler hàng đợi theo file, không bao giờ song song cho cùng file):
 * LOCAL (điều kiện tiên quyết) → GIT → DRIVE → NOTEBOOK, các đích remote độc lập nhau. Mỗi thay đổi bước phát
 * PUBLISH_PROGRESS; kết thúc cập nhật trạng thái sync của file (SYNCED / ERROR, còn lần chờ thì giữ SYNCING).
 */
export class ExecutePublishRunAction extends Action<{ runId: string }, void> {
  constructor(
    private readonly getRun = new GetPublishRunTask(),
    private readonly updateStep = new UpdatePublishStepTask(),
    private readonly finishRun = new FinishPublishRunTask(),
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly getSpecInfo = new GetSpecFileInfoTask(),
    private readonly readSpec = new ReadSpecFileTask(),
    private readonly recordChange = new RecordSpecChangeTask(),
    private readonly publishGit = new PublishGitChangesSubAction(),
    private readonly uploadDrive = new UploadDriveFileTask(),
    private readonly replaceTextSource = new ReplaceNotebookTextSourceTask(),
    private readonly refreshDriveSource = new RefreshNotebookDriveSourceTask(),
  ) {
    super();
  }

  async run({ runId }: { runId: string }): Promise<void> {
    const run = await this.getRun.run({ runId });
    if (!run) return;

    let ctx: RunContext | undefined;
    try {
      const ws = await this.getWorkspace.run({ workspaceId: run.workspaceId });
      ctx = { ws, config: await this.readConfig.run({ workspacePath: ws.path }), location: specsLocationOf(ws) };
    } catch (err) {
      logger.warn({ err, runId }, "không chuẩn bị được pipeline publish");
    }

    let prerequisiteFailed = !ctx;
    for (const step of run.steps) {
      if (step.status !== "PENDING") continue;
      if (prerequisiteFailed) {
        await this.updateStep.run({ runId, target: step.target, patch: { status: "SKIPPED", error: { code: "PUBLISH.PREREQUISITE_FAILED" } } });
        continue;
      }
      const ok = await this.runStep(run, step.target, ctx!);
      if (!ok && step.target === "LOCAL") prerequisiteFailed = true;
    }

    const finished = await this.finishRun.run({ runId });
    if (!finished) return;
    const syncStatus = finished.pendingForFile > 0 ? "SYNCING" : finished.hasError || prerequisiteFailed ? "ERROR" : "SYNCED";
    await this.recordChange.run({ workspaceId: run.workspaceId, file: run.file, change: "UPDATED", syncStatus });
  }

  /** Chạy một đích, cập nhật RUNNING → DONE / ERROR. Trả false nếu lỗi. */
  private async runStep(run: PublishRun, target: PublishTarget, ctx: RunContext): Promise<boolean> {
    const progress = (detail: string) => {
      void this.updateStep.run({ runId: run.runId, target, patch: { detail } });
    };
    await this.updateStep.run({ runId: run.runId, target, patch: { status: "RUNNING", detail: null, url: null, error: null } });
    try {
      const result = await this.execute(run, target, ctx, progress);
      await this.updateStep.run({ runId: run.runId, target, patch: { status: "DONE", detail: result.detail, url: result.url } });
      return true;
    } catch (err) {
      if (!(err instanceof AppException)) logger.error({ err, runId: run.runId, target }, "bước publish lỗi");
      await this.updateStep.run({ runId: run.runId, target, patch: { status: "ERROR", error: stepError(err) } });
      return false;
    }
  }

  private execute(run: PublishRun, target: PublishTarget, ctx: RunContext, progress: (d: string) => void): Promise<StepResult> {
    switch (target) {
      case "LOCAL":
        return this.local(run, ctx);
      case "GIT":
        return this.git(run, ctx, progress);
      case "DRIVE":
        return this.drive(run, ctx, progress);
      case "NOTEBOOK":
        return this.notebook(run, ctx, progress);
    }
  }

  /** File đã được ghi khi Approve; bước này xác nhận file còn trên đĩa: "specs/<file> · <size>". */
  private async local(run: PublishRun, ctx: RunContext): Promise<StepResult> {
    const info = await this.getSpecInfo.run({ location: ctx.location, file: run.file });
    const dir = ctx.ws.specs_dir.replace(/^\.\/?/, "").replace(/\/$/, "");
    return { detail: `${dir ? `${dir}/` : ""}${info.file} · ${formatSize(info.size)}`, url: null };
  }

  private async git(run: PublishRun, ctx: RunContext, progress: (d: string) => void): Promise<StepResult> {
    const git = ctx.config!.storage.git!;
    const info = await this.getSpecInfo.run({ location: ctx.location, file: run.file });
    const result = await this.publishGit.run({
      workspacePath: ctx.ws.path,
      git,
      files: [info.absolutePath],
      action: run.action,
      filename: info.file,
      // Approve theo autoPush; Force Sync / Thử lại luôn đẩy lên.
      push: run.trigger === "FORCE" || git.autoPush,
      onProgress: progress,
    });
    if (result.pullRequest) return { detail: `PR #${result.pullRequest.number}`, url: result.pullRequest.url };
    const sha = result.sha ? result.sha.slice(0, 7) : "—";
    const suffix = !result.committed && !result.pushed ? " · không có thay đổi" : result.pushed ? "" : " · chưa push";
    return { detail: `${result.branch} · ${sha}${suffix}`, url: null };
  }

  private async drive(run: PublishRun, ctx: RunContext, progress: (d: string) => void): Promise<StepResult> {
    const folderId = ctx.config!.storage.drive!.folderId;
    const asGoogleDoc = sharesDriveFolder(ctx.config);
    progress(`upload ${run.file}…`);
    const { content, file } = await this.readSpec.run({ workspaceId: run.workspaceId, location: ctx.location, file: run.file });
    const uploaded = await this.uploadDrive.run({ workspaceId: run.workspaceId, folderId, name: file, content, asGoogleDoc });
    if (asGoogleDoc) ctx.googleDocId = uploaded.fileId;
    return { detail: `${uploaded.folderName}/${file} · ${uploaded.created ? "đã tạo" : "đã ghi đè"}`, url: uploaded.url };
  }

  private async notebook(run: PublishRun, ctx: RunContext, progress: (d: string) => void): Promise<StepResult> {
    const nbl = ctx.config!.nbl;
    const notebookId = nbl.notebookId!;
    const { content, file } = await this.readSpec.run({ workspaceId: run.workspaceId, location: ctx.location, file: run.file });
    const done = { detail: `${notebookId.slice(0, 8)} · source ${file}`, url: NOTEBOOK_URL(notebookId) };

    if (nbl.syncStrategy === "RPC") {
      progress(`replace source “${file}”`);
      await this.replaceTextSource.run({ notebookId, title: file, content });
      return done;
    }

    if (!nbl.driveFolderId) throw new NotebookNotConfiguredException({ field: "driveFolderId" });
    let documentId = ctx.googleDocId;
    if (!documentId) {
      progress(`ghi Google Doc ${file}…`);
      documentId = (await this.uploadDrive.run({ workspaceId: run.workspaceId, folderId: nbl.driveFolderId, name: file, content, asGoogleDoc: true })).fileId;
    }
    progress(`refresh source “${file}”`);
    await this.refreshDriveSource.run({ notebookId, documentId, title: file });
    return done;
  }
}
