import "server-only";
import { Action } from "@/ship/parents/Action";
import type { CliRun } from "../Data/Stores/CliRunStore";
import { GetCliRunTask } from "../Tasks/GetCliRunTask";

/** Lấy run để theo dõi event (SSE). Không có → AGENT.RUN_NOT_FOUND. */
export class WatchCliRunAction extends Action<{ runId: string }, Pick<CliRun, "subscribe">> {
  constructor(private readonly getRun = new GetCliRunTask()) {
    super();
  }

  run({ runId }: { runId: string }): Promise<Pick<CliRun, "subscribe">> {
    return this.getRun.run({ runId });
  }
}
