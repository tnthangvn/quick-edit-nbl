import "server-only";
import { logger } from "@/ship/adapters/logger";
import type { CliOutputFormat } from "@/ship/contracts/enums/agent";
import type { ErrorCode, ErrorParams } from "@/ship/contracts/errors";
import { SubAction } from "@/ship/parents/SubAction";
import { SaveSessionRunTask } from "../../Session/Tasks/SaveSessionRunTask";
import { SetCliSessionIdTask } from "../../Session/Tasks/SetCliSessionIdTask";
import type { CliRun } from "../Data/Stores/CliRunStore";
import type { CliRunEvent, CliRunEventDraft } from "../Events/CliRunEvent";
import type { CliInvocation } from "../Models/CliInvocation";
import type { Sandbox } from "../Models/Sandbox";
import { createCliOutputParser, isPermissionDeniedLine } from "../Parsers/cliOutputParsers";
import { DiffSandboxTask } from "../Tasks/DiffSandboxTask";
import { EmitSpecProposalTask } from "../Tasks/EmitSpecProposalTask";
import { RemoveSandboxTask } from "../Tasks/RemoveSandboxTask";
import { RunCliProcessTask } from "../Tasks/RunCliProcessTask";

export type ExecuteCliRunInput = {
  run: CliRun;
  /** Phiên chat chứa run: nhận id phiên CLI để lượt sau resume, lưu transcript khi run kết thúc. */
  session: { sessionId: string; profileId: string; prompt: string; resumed: boolean };
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
    case "THINKING":
      return { ...draft, text: redact(draft.text) };
    case "TOOL_CALL":
      return { ...draft, input: redact(draft.input), target: draft.target === null ? null : redact(draft.target) };
    case "TOOL_RESULT":
      return { ...draft, output: redact(draft.output) };
    default:
      return draft;
  }
}

/**
 * Phần chạy nền của một run: chạy CLI trong sandbox, parse output thành event, khi xong so sánh sandbox với
 * file thật và phát đề xuất (SPEC_PROPOSED + PROPOSAL). Luôn kết thúc bằng một STATUS, lưu run vào session và xoá sandbox
 * (trừ sandbox cố định của session). Không bao giờ ném lỗi.
 */
export class ExecuteCliRunSubAction extends SubAction<ExecuteCliRunInput> {
  constructor(
    private readonly runProcess = new RunCliProcessTask(),
    private readonly diffSandbox = new DiffSandboxTask(),
    private readonly emitProposal = new EmitSpecProposalTask(),
    private readonly removeSandbox = new RemoveSandboxTask(),
    private readonly setCliSessionId = new SetCliSessionIdTask(),
    private readonly saveRun = new SaveSessionRunTask(),
  ) {
    super();
  }

  async run({ run, session, invocation, sandbox, specsDir, outputFormat, streamStdout, timeoutMs }: ExecuteCliRunInput): Promise<void> {
    const redact = redactor(invocation.secretValues);
    let cliSessionSaved: Promise<void> = Promise.resolve();
    const emit = (draft: CliRunEventDraft) => {
      if (draft.type === "LOG" && !streamStdout) return;
      if (draft.type === "SESSION") {
        cliSessionSaved = this.setCliSessionId
          .run({ sessionId: session.sessionId, profileId: session.profileId, cliSessionId: draft.cliSessionId })
          .catch((err: unknown) => logger.warn({ err, runId: run.id }, "không lưu được id phiên CLI"));
      }
      run.push(redactDraft(draft, redact));
    };
    // STATUS kết thúc chỉ phát sau khi đã lưu session: client thấy run xong là đọc lại được transcript đầy đủ.
    let final: CliRunEventDraft = { type: "STATUS", status: "FAILED", exitCode: null, error: { code: "INTERNAL.UNEXPECTED" } };
    const finish = (status: "DONE" | "FAILED" | "STOPPED", exitCode: number | null = null, error?: { code: ErrorCode; params?: ErrorParams }) => {
      final = { type: "STATUS", status, exitCode, error: error ?? null };
    };

    let permissionDenied = false;
    const parseLine = createCliOutputParser(outputFormat);
    try {
      const result = await this.runProcess.run({
        invocation,
        cwd: sandbox.dir,
        signal: run.abort.signal,
        timeoutMs,
        onLine: (stream, line) => {
          if (isPermissionDeniedLine(line)) permissionDenied = true;
          const drafts: CliRunEventDraft[] = stream === "STDERR" ? [{ type: "LOG", stream, text: line }] : parseLine(line);
          drafts.forEach(emit);
        },
      });

      if (result.outcome === "CANCELED") return finish("STOPPED");
      if (result.outcome === "TIMED_OUT") return finish("FAILED", null, { code: "AGENT.CLI_TIMEOUT" });
      if (result.outcome === "SPAWN_FAILED") return finish("FAILED", null, { code: "AGENT.CLI_SPAWN_FAILED" });
      if (result.exitCode !== 0) {
        return finish("FAILED", result.exitCode, { code: "AGENT.CLI_EXIT_NONZERO", params: { exitCode: result.exitCode } });
      }
      if (permissionDenied) return finish("FAILED", 0, { code: "AGENT.CLI_PERMISSION_DENIED", params: { profileId: session.profileId } });

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
      if (!sandbox.persistent) await this.removeSandbox.run({ root: sandbox.root });
      const status = run.prepare(final);
      await cliSessionSaved;
      await this.saveTranscript(run, session, status);
      if (session.resumed && status.type === "STATUS" && status.status === "FAILED" && !run.events.some((e) => e.type === "SESSION")) {
        // Resume hỏng (phiên CLI mất) mà CLI không cấp phiên mới: quên id cũ để lượt sau bắt đầu phiên mới.
        await this.setCliSessionId
          .run({ sessionId: session.sessionId, profileId: session.profileId, cliSessionId: null })
          .catch((err: unknown) => logger.warn({ err, runId: run.id }, "không xoá được id phiên CLI"));
      }
      run.emit(status);
    }
  }

  private async saveTranscript(run: CliRun, session: ExecuteCliRunInput["session"], status: CliRunEvent): Promise<void> {
    if (status.type !== "STATUS") return;
    try {
      await this.saveRun.run({
        id: run.id,
        session_id: session.sessionId,
        prompt: session.prompt,
        profile_id: session.profileId,
        status: status.status,
        exit_code: status.exitCode,
        error: status.error,
        events: { items: [...run.events, status] },
      });
    } catch (err) {
      logger.error({ err, runId: run.id }, "không lưu được run vào session");
    }
  }
}
