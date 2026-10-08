import "server-only";
import { logger } from "@/ship/adapters/logger";
import type { CliOutputFormat } from "@/ship/contracts/enums/agent";
import type { ErrorCode, ErrorParams } from "@/ship/contracts/errors";
import { SubAction } from "@/ship/parents/SubAction";
import type { CliRun } from "../Data/Stores/CliRunStore";
import type { CliRunEventDraft } from "../Events/CliRunEvent";
import type { CliInvocation } from "../Models/CliInvocation";
import type { Sandbox } from "../Models/Sandbox";
import { parseCliLine } from "../Parsers/cliOutputParsers";
import { DiffSandboxTask } from "../Tasks/DiffSandboxTask";
import { EmitSpecProposalTask } from "../Tasks/EmitSpecProposalTask";
import { RemoveSandboxTask } from "../Tasks/RemoveSandboxTask";
import { RunCliProcessTask } from "../Tasks/RunCliProcessTask";

export type ExecuteCliRunInput = {
  run: CliRun;
  invocation: CliInvocation;
  sandbox: Sandbox;
  /** specsDir thật của workspace (chỉ đọc để so sánh). */
  specsDir: string;
  outputFormat: CliOutputFormat;
  /** Settings Tab 2 "Stream Stdout": tắt thì không phát LOG. */
  streamStdout: boolean;
  timeoutMs: number;
};

/** Che secret (env "secret:<ref>") nếu CLI lỡ in ra. */
function redactor(secrets: string[]) {
  const values = secrets.filter((s) => s.length >= 6);
  return (text: string) => values.reduce((t, s) => t.replaceAll(s, "***"), text);
}

function redactDraft(draft: CliRunEventDraft, redact: (t: string) => string): CliRunEventDraft {
  switch (draft.type) {
    case "LOG":
    case "MESSAGE":
      return { ...draft, text: redact(draft.text) };
    case "TOOL_CALL":
      return { ...draft, input: redact(draft.input) };
    default:
      return draft;
  }
}

/**
 * Phần chạy nền của một run: chạy CLI trong sandbox, parse output thành event, khi xong so sánh sandbox với
 * file thật và phát đề xuất (SPEC_PROPOSED + PROPOSAL). Luôn kết thúc bằng một STATUS và xoá sandbox. Không bao giờ ném lỗi.
 */
export class ExecuteCliRunSubAction extends SubAction<ExecuteCliRunInput> {
  constructor(
    private readonly runProcess = new RunCliProcessTask(),
    private readonly diffSandbox = new DiffSandboxTask(),
    private readonly emitProposal = new EmitSpecProposalTask(),
    private readonly removeSandbox = new RemoveSandboxTask(),
  ) {
    super();
  }

  async run({ run, invocation, sandbox, specsDir, outputFormat, streamStdout, timeoutMs }: ExecuteCliRunInput): Promise<void> {
    const redact = redactor(invocation.secretValues);
    const emit = (draft: CliRunEventDraft) => {
      if (draft.type === "LOG" && !streamStdout) return;
      run.push(redactDraft(draft, redact));
    };
    const finish = (status: "DONE" | "FAILED" | "STOPPED", exitCode: number | null = null, error?: { code: ErrorCode; params?: ErrorParams }) =>
      run.push({ type: "STATUS", status, exitCode, error: error ?? null });

    try {
      const result = await this.runProcess.run({
        invocation,
        cwd: sandbox.dir,
        signal: run.abort.signal,
        timeoutMs,
        onLine: (stream, line) => {
          const drafts: CliRunEventDraft[] = stream === "STDERR" ? [{ type: "LOG", stream, text: line }] : parseCliLine(outputFormat, line);
          drafts.forEach(emit);
        },
      });

      if (result.outcome === "CANCELED") return finish("STOPPED");
      if (result.outcome === "TIMED_OUT") return finish("FAILED", null, { code: "AGENT.CLI_TIMEOUT" });
      if (result.outcome === "SPAWN_FAILED") return finish("FAILED", null, { code: "AGENT.CLI_SPAWN_FAILED" });
      if (result.exitCode !== 0) {
        return finish("FAILED", result.exitCode, { code: "AGENT.CLI_EXIT_NONZERO", params: { exitCode: result.exitCode } });
      }

      const changes = await this.diffSandbox.run({ originalDir: specsDir, sandboxDir: sandbox.dir, baseline: sandbox.baseline });
      for (const change of changes) {
        await this.emitProposal.run({ workspaceId: run.workspaceId, runId: run.id, change });
        run.push({ type: "PROPOSAL", file: change.file, isNewFile: change.isNewFile });
      }
      finish("DONE", 0);
    } catch (err) {
      logger.error({ err, runId: run.id }, "CLI run lỗi ngoài dự kiến");
      finish("FAILED", null, { code: "INTERNAL.UNEXPECTED" });
    } finally {
      await this.removeSandbox.run({ root: sandbox.root });
    }
  }
}
