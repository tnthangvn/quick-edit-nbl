import "server-only";
import path from "node:path";
import { runGit, type GitRunner } from "@/ship/adapters/git";
import { Task } from "@/ship/parents/Task";
import { gitFailure } from "../Exceptions/mapFailures";

export type GetGitStatusInput = { cwd: string; branch: string; paths: string[] };
export type GitChangedFile = { path: string; deleted: boolean };
export type GetGitStatusOutput = {
  currentBranch: string;
  /** Thay đổi chưa commit (kể cả file mới) trong `paths`; đường dẫn tuyệt đối. */
  changed: GitChangedFile[];
  /** So với refs/remotes/origin/<branch> (lần fetch / push gần nhất); null nếu chưa có ref theo dõi. */
  ahead: number | null;
  behind: number | null;
};

/** Trạng thái Git cục bộ (không gọi mạng) cho Storage Status trên Header. */
export class GetGitStatusTask extends Task<GetGitStatusInput, GetGitStatusOutput> {
  constructor(private readonly git: GitRunner = runGit) {
    super();
  }

  async run({ cwd, branch, paths }: GetGitStatusInput): Promise<GetGitStatusOutput> {
    const top = await this.git(["rev-parse", "--show-toplevel"], { cwd });
    if (top.exitCode !== 0) throw gitFailure("rev-parse", top);
    const toplevel = top.stdout.trim();
    const status = await this.git(["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...paths], { cwd });
    if (status.exitCode !== 0) throw gitFailure("status", status);
    const changed: GitChangedFile[] = [];
    const tokens = status.stdout.split("\0");
    for (let i = 0; i < tokens.length; i++) {
      const entry = tokens[i];
      if (entry.length < 4) continue;
      const xy = entry.slice(0, 2);
      changed.push({ path: path.join(toplevel, entry.slice(3)), deleted: xy.includes("D") });
      if (xy[0] === "R" || xy[0] === "C") {
        const from = tokens[++i];
        if (xy[0] === "R" && from) changed.push({ path: path.join(toplevel, from), deleted: true });
      }
    }

    const current = await this.git(["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
    const counts = await this.git(["rev-list", "--left-right", "--count", `HEAD...refs/remotes/origin/${branch}`], { cwd });
    const [ahead, behind] = counts.exitCode === 0 ? counts.stdout.trim().split(/\s+/).map(Number) : [null, null];
    return { currentBranch: current.stdout.trim(), changed, ahead: ahead ?? null, behind: behind ?? null };
  }
}
