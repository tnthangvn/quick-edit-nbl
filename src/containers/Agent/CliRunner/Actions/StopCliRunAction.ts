import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetCliRunTask } from "../Tasks/GetCliRunTask";

/** Dừng run (SIGTERM, sau 5s SIGKILL). Run đã kết thúc thì không làm gì (idempotent). STATUS STOPPED đi qua SSE. */
export class StopCliRunAction extends Action<{ runId: string }> {
  constructor(private readonly getRun = new GetCliRunTask()) {
    super();
  }

  async run({ runId }: { runId: string }): Promise<void> {
    const run = await this.getRun.run({ runId });
    if (run.active) run.abort.abort();
  }
}
