import "server-only";
import path from "node:path";
import { studio } from "@/containers/providers";
import type { AgentSettingsAccess, SpecAccess } from "@/ship/contracts/studioAccess";
import { Action } from "@/ship/parents/Action";
import { GetAgentSessionTask } from "../../Session/Tasks/GetAgentSessionTask";
import { CliProfileNotFoundException } from "../Exceptions/CliRunnerExceptions";
import { ExecuteCliRunSubAction } from "../SubActions/ExecuteCliRunSubAction";
import { BuildCliInvocationTask } from "../Tasks/BuildCliInvocationTask";
import { CreateCliRunTask } from "../Tasks/CreateCliRunTask";
import { DiscardCliRunTask } from "../Tasks/DiscardCliRunTask";
import { PrepareSandboxTask } from "../Tasks/PrepareSandboxTask";
import { WriteCliAttachmentsTask } from "../Tasks/WriteCliAttachmentsTask";
import { attachmentPaths, type CliImage } from "../Models/Sandbox";

export type StartCliRunInput = {
  workspaceId: string;
  sessionId: string;
  profileId: string;
  prompt: string;
  contextFiles: string[];
  /** Ảnh dán từ clipboard (tối đa 5). */
  images?: CliImage[];
};

/** Thêm danh sách ảnh đính kèm vào cuối prompt gửi CLI (transcript vẫn lưu prompt gốc). */
export function withAttachmentNote(prompt: string, paths: readonly string[]): string {
  if (paths.length === 0) return prompt;
  return `${prompt}\n\nẢnh đính kèm (đọc bằng công cụ đọc file):\n${paths.map((p) => `- ./${p}`).join("\n")}`;
}

/** Thời gian tối đa của một run CLI. */
export const CLI_RUN_TIMEOUT_MS = 15 * 60_000;

/**
 * Bắt đầu một run CLI agent (spec Tab 2, 2.5): kiểm tra profile + binary, chép specsDir vào sandbox, chạy nền.
 * Trả runId ngay (202); tiến trình theo dõi qua SSE. Không bao giờ ghi file thật.
 */
export class StartCliRunAction extends Action<StartCliRunInput, { runId: string }> {
  constructor(
    private readonly specs: SpecAccess = studio.specs(),
    private readonly settings: AgentSettingsAccess = studio.agentSettings(),
    private readonly getSession = new GetAgentSessionTask(),
    private readonly createRun = new CreateCliRunTask(),
    private readonly discardRun = new DiscardCliRunTask(),
    private readonly buildInvocation = new BuildCliInvocationTask(),
    private readonly prepareSandbox = new PrepareSandboxTask(),
    private readonly execute = new ExecuteCliRunSubAction(),
    private readonly timeoutMs = CLI_RUN_TIMEOUT_MS,
    private readonly writeAttachments = new WriteCliAttachmentsTask(),
  ) {
    super();
  }

  async run({ workspaceId, sessionId, profileId, prompt, contextFiles, images = [] }: StartCliRunInput): Promise<{ runId: string }> {
    const workspace = await this.specs.getWorkspace(workspaceId);
    const session = await this.getSession.run({ sessionId, workspaceId });
    const { cli } = await this.settings.get(workspaceId);
    const profile = cli.profiles.find((p) => p.id === profileId);
    if (!profile) throw new CliProfileNotFoundException({ profileId });
    // Cùng profile với lượt trước → nối tiếp hội thoại của CLI; đổi profile thì bắt đầu phiên CLI mới.
    const resumeId = session.cli_profile_id === profileId ? session.cli_session_id : null;

    const run = await this.createRun.run({ workspaceId });
    try {
      const imagePaths = attachmentPaths(run.id, images);
      const invocation = await this.buildInvocation.run({ profile, prompt: withAttachmentNote(prompt, imagePaths), contextFiles, resumeId, permissionMode: cli.permissionMode, effort: cli.effort });
      const specsDir = path.resolve(workspace.path, workspace.specsDir);
      const sandbox = await this.prepareSandbox.run({ specsDir, sessionId });
      await this.writeAttachments.run({ dir: sandbox.dir, images, paths: imagePaths });
      run.push({ type: "STATUS", status: "RUNNING", exitCode: null, error: null });
      // Chạy nền: SubAction tự đẩy STATUS kết thúc và không ném lỗi.
      void this.execute.run({
        run,
        session: { sessionId, profileId, prompt, resumed: Boolean(resumeId) },
        invocation,
        sandbox,
        specsDir,
        outputFormat: profile.outputFormat,
        streamStdout: cli.streamStdout,
        timeoutMs: this.timeoutMs,
      });
      return { runId: run.id };
    } catch (err) {
      await this.discardRun.run({ runId: run.id });
      throw err;
    }
  }
}
