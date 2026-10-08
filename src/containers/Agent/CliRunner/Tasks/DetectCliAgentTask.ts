import "server-only";
import { run, versionOf, which } from "@/ship/adapters/process";
import type { CliAgentKind } from "@/ship/contracts/enums/agent";
import { Task } from "@/ship/parents/Task";
import type { CliLoginStatus } from "../Enums/CliLoginStatus";

/** Loại CLI có binary cố định để dò (CUSTOM do người dùng tự khai, không dò). */
export type DetectableCliKind = Exclude<CliAgentKind, "CUSTOM">;

export type CliAgentDetection = {
  kind: DetectableCliKind;
  binary: string;
  found: boolean;
  path: string | null;
  version: string | null;
  loginStatus: CliLoginStatus;
  /** Lệnh cài đặt gợi ý (hiển thị nguyên văn, font mono); null nếu không có lệnh cài chuẩn. */
  installCommand: string | null;
};

type LoginProbe = { args: string[]; parse: (r: { exitCode: number; stdout: string }) => CliLoginStatus };

const CATALOG: Record<DetectableCliKind, { binary: string; installCommand: string | null; login: LoginProbe | null }> = {
  CLAUDE_CODE: {
    binary: "claude",
    installCommand: "npm install -g @anthropic-ai/claude-code",
    login: {
      args: ["auth", "status", "--json"],
      // Chưa đăng nhập thì exit 1 nhưng vẫn in JSON { loggedIn: false }.
      parse: ({ stdout }) => {
        try {
          return (JSON.parse(stdout) as { loggedIn?: unknown }).loggedIn === true ? "LOGGED_IN" : "LOGGED_OUT";
        } catch {
          return "UNKNOWN";
        }
      },
    },
  },
  CODEX: {
    binary: "codex",
    installCommand: "npm install -g @openai/codex",
    login: { args: ["login", "status"], parse: ({ exitCode }) => (exitCode === 0 ? "LOGGED_IN" : "LOGGED_OUT") },
  },
  ANTIGRAVITY: {
    binary: "agy",
    installCommand: null,
    // `agy models` cần phiên đăng nhập; lỗi có thể do mạng nên chỉ báo UNKNOWN.
    login: { args: ["models"], parse: ({ exitCode }) => (exitCode === 0 ? "LOGGED_IN" : "UNKNOWN") },
  },
  AIDER: { binary: "aider", installCommand: "python -m pip install aider-install", login: null },
};

const LOGIN_TIMEOUT_MS = 10_000;

/** Dò một CLI agent: có trong PATH không (`which`), phiên bản, trạng thái đăng nhập (best-effort). */
export class DetectCliAgentTask extends Task<{ kind: DetectableCliKind }, CliAgentDetection> {
  async run({ kind }: { kind: DetectableCliKind }): Promise<CliAgentDetection> {
    const { binary, installCommand, login } = CATALOG[kind];
    const found = await which(binary);
    if (!found) return { kind, binary, found: false, path: null, version: null, loginStatus: "UNKNOWN", installCommand };

    const [version, loginStatus] = await Promise.all([
      versionOf(found).catch(() => undefined),
      login
        ? run(found, login.args, { timeout: LOGIN_TIMEOUT_MS }).then(login.parse, (): CliLoginStatus => "UNKNOWN")
        : Promise.resolve<CliLoginStatus>("NOT_APPLICABLE"),
    ]);
    return { kind, binary, found: true, path: found, version: version ?? null, loginStatus, installCommand };
  }
}

export const DETECTABLE_CLI_KINDS = Object.keys(CATALOG) as DetectableCliKind[];
