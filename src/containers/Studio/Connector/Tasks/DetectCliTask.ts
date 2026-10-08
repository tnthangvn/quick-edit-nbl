import "server-only";
import type { GitProvider } from "@/ship/contracts/enums/sync";
import { Task } from "@/ship/parents/Task";
import { KNOWN_CLIS, parseAuthStatus } from "../Gateways/cliTools";
import { defaultConnectorDeps, type ConnectorDeps } from "../Gateways/deps";

export type DetectedCli = {
  command: string;
  provider: GitProvider;
  path: string | null;
  version: string | null;
  loggedIn: boolean;
  host: string | null;
  account: string | null;
  loginCommand: string;
};

/** Tự dò CLI Git provider trên máy (gh, glab, tea): which + phiên bản + trạng thái đăng nhập. Không đọc / lưu token. */
export class DetectCliTask extends Task<void, DetectedCli[]> {
  constructor(private readonly deps: ConnectorDeps = defaultConnectorDeps()) {
    super();
  }

  run(): Promise<DetectedCli[]> {
    const { which, versionOf, run } = this.deps.process;
    return Promise.all(
      KNOWN_CLIS.map(async (cli): Promise<DetectedCli> => {
        const found = await which(cli.binary);
        const base = { command: cli.binary, provider: cli.provider, path: found ?? null, loginCommand: cli.loginCommand("") };
        if (!found) return { ...base, version: null, loggedIn: false, host: null, account: null };
        const [version, status] = await Promise.all([
          versionOf(cli.binary),
          run(cli.binary, cli.detectArgs, { timeout: 15_000 }),
        ]);
        const parsed = parseAuthStatus(`${status.stdout}\n${status.stderr}`);
        const loggedIn = status.exitCode === 0 && (cli.binary !== "tea" || status.stdout.trim().length > 0);
        return {
          ...base,
          loginCommand: cli.loginCommand(parsed.host ?? ""),
          version: version ?? null,
          loggedIn,
          host: loggedIn ? parsed.host : null,
          account: loggedIn ? parsed.account : null,
        };
      }),
    );
  }
}
