import "server-only";
import { createInterface } from "node:readline";
import { loadExeca } from "@/ship/adapters/process";
import { Task } from "@/ship/parents/Task";
import type { CliLogStream } from "../Enums/CliLogStream";
import type { CliInvocation } from "../Models/CliInvocation";

export type RunCliProcessInput = {
  invocation: CliInvocation;
  cwd: string;
  signal: AbortSignal;
  timeoutMs: number;
  onLine: (stream: CliLogStream, line: string) => void;
};

export type RunCliProcessResult =
  | { outcome: "EXITED"; exitCode: number }
  | { outcome: "CANCELED" }
  | { outcome: "TIMED_OUT" }
  | { outcome: "SPAWN_FAILED" };

/** Thời gian chờ sau SIGTERM trước khi SIGKILL. */
const FORCE_KILL_AFTER_MS = 5_000;

/**
 * Chạy CLI agent KHÔNG qua shell (tham số là mảng), stdin đóng, đọc stdout/stderr theo dòng.
 * Dừng bằng `signal` (DELETE run) hoặc khi quá `timeoutMs`.
 */
export class RunCliProcessTask extends Task<RunCliProcessInput, RunCliProcessResult> {
  async run({ invocation, cwd, signal, timeoutMs, onLine }: RunCliProcessInput): Promise<RunCliProcessResult> {
    const execa = await loadExeca();
    const child = execa(invocation.command, invocation.args, {
      cwd,
      env: invocation.env,
      extendEnv: false,
      shell: false,
      stdin: "ignore",
      buffer: false,
      reject: false,
      timeout: timeoutMs,
      cancelSignal: signal,
      forceKillAfterDelay: FORCE_KILL_AFTER_MS,
    });

    const pipes = (["STDOUT", "STDERR"] as const).map(async (stream) => {
      const source = stream === "STDOUT" ? child.stdout : child.stderr;
      if (!source) return;
      for await (const line of createInterface({ input: source, crlfDelay: Infinity })) onLine(stream, line);
    });

    const result = await child;
    await Promise.allSettled(pipes);

    if (result.isCanceled) return { outcome: "CANCELED" };
    if (result.timedOut) return { outcome: "TIMED_OUT" };
    if (typeof result.exitCode !== "number") return { outcome: "SPAWN_FAILED" };
    return { outcome: "EXITED", exitCode: result.exitCode };
  }
}
