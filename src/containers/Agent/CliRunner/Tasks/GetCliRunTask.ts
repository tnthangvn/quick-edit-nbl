import "server-only";
import { Task } from "@/ship/parents/Task";
import { cliRunStore, type CliRun, type CliRunStore } from "../Data/Stores/CliRunStore";
import { CliRunNotFoundException } from "../Exceptions/CliRunnerExceptions";

export class GetCliRunTask extends Task<{ runId: string }, CliRun> {
  constructor(private readonly store: CliRunStore = cliRunStore) {
    super();
  }

  async run({ runId }: { runId: string }): Promise<CliRun> {
    const run = this.store.get(runId);
    if (!run) throw new CliRunNotFoundException({ runId });
    return run;
  }
}
