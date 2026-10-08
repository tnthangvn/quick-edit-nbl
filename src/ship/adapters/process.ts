import "server-only";
import type { Options } from "execa";

/** Nạp execa khi cần: tránh lỗi resolve của execa dưới điều kiện "react-server" (script build OpenAPI không chạy lệnh nào). */
const loadExeca = () => import("execa").then((m) => m.execa);

export type RunResult = { exitCode: number; stdout: string; stderr: string; timedOut: boolean };

export type RunOptions = {
  cwd?: string;
  env?: Record<string, string>;
  /** ms, mặc định 60s */
  timeout?: number;
  input?: string;
  signal?: AbortSignal;
};

/**
 * Chạy lệnh ngoài (git, gh, glab, claude, codex, agy, nlm...) KHÔNG qua shell: tham số truyền dạng mảng,
 * không ghép chuỗi lệnh → không bị chèn lệnh. Không ném lỗi khi exit code ≠ 0; caller tự quyết định.
 */
export async function run(command: string, args: readonly string[], opts: RunOptions = {}): Promise<RunResult> {
  const options: Options = {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    timeout: opts.timeout ?? 60_000,
    input: opts.input,
    cancelSignal: opts.signal,
    reject: false,
    shell: false,
    stripFinalNewline: true,
  };
  const execa = await loadExeca();
  const r = await execa(command, args, options);
  return {
    exitCode: typeof r.exitCode === "number" ? r.exitCode : -1,
    stdout: String(r.stdout ?? ""),
    stderr: String(r.stderr ?? ""),
    timedOut: Boolean(r.timedOut),
  };
}

/** Đường dẫn tuyệt đối của binary trong PATH, không có thì undefined. */
export async function which(binary: string): Promise<string | undefined> {
  if (!/^[\w.@+-]+$/.test(binary)) return undefined;
  const r = await run(process.platform === "win32" ? "where" : "which", [binary], { timeout: 5_000 });
  return r.exitCode === 0 ? r.stdout.split(/\r?\n/)[0] : undefined;
}

/** Phiên bản của binary (`<bin> --version`), lấy dòng đầu. */
export async function versionOf(binary: string, args: readonly string[] = ["--version"]): Promise<string | undefined> {
  const r = await run(binary, args, { timeout: 10_000 });
  return r.exitCode === 0 ? (r.stdout || r.stderr).split(/\r?\n/)[0].trim() : undefined;
}

export { loadExeca };
