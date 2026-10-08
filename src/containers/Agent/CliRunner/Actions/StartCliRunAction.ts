import "server-only";
import path from "node:path";
import { studio } from "@/containers/providers";
import type { AgentSettingsAccess, SpecAccess } from "@/ship/contracts/studioAccess";
import { Action } from "@/ship/parents/Action";
import { CliProfileNotFoundException } from "../Exceptions/CliRunnerExceptions";
import { ExecuteCliRunSubAction } from "../SubActions/ExecuteCliRunSubAction";
import { BuildCliInvocationTask } from "../Tasks/BuildCliInvocationTask";
import { CreateCliRunTask } from "../Tasks/CreateCliRunTask";
import { DiscardCliRunTask } from "../Tasks/DiscardCliRunTask";
import { PrepareSandboxTask } from "../Tasks/PrepareSandboxTask";

export type StartCliRunInput = {
  workspaceId: string;
  profileId: string;
  prompt: string;
  contextFiles: string[];
};

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
    private readonly createRun = new CreateCliRunTask(),
    private readonly discardRun = new DiscardCliRunTask(),
    private readonly buildInvocation = new BuildCliInvocationTask(),
    private readonly prepareSandbox = new PrepareSandboxTask(),
    private readonly execute = new ExecuteCliRunSubAction(),
    private readonly timeoutMs = CLI_RUN_TIMEOUT_MS,
  ) {
    super();
  }

  async run({ workspaceId, profileId, prompt, contextFiles }: StartCliRunInput): Promise<{ runId: string }> {
    const workspace = await this.specs.getWorkspace(workspaceId);
    const { cli } = await this.settings.get(workspaceId);
    const profile = cli.profiles.find((p) => p.id === profileId);
    if (!profile) throw new CliProfileNotFoundException({ profileId });

    const run = await this.createRun.run({ workspaceId });
    try {
      const invocation = await this.buildInvocation.run({ profile, prompt, contextFiles });
      const specsDir = path.resolve(workspace.path, workspace.specsDir);
      const sandbox = await this.prepareSandbox.run({ specsDir });
      run.push({ type: "STATUS", status: "RUNNING", exitCode: null, error: null });
      // Chạy nền: SubAction tự đẩy STATUS kết thúc và không ném lỗi.
      void this.execute.run({
        run,
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
