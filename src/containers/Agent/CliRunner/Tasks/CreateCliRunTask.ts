import "server-only";
import { Task } from "@/ship/parents/Task";
import { cliRunStore, type CliRun, type CliRunStore } from "../Data/Stores/CliRunStore";
import { CliRunAlreadyActiveException } from "../Exceptions/CliRunnerExceptions";

/** Giữ chỗ một run cho workspace; workspace đang có run chạy dở → AGENT.RUN_ALREADY_ACTIVE (409). */
export class CreateCliRunTask extends Task<{ workspaceId: string }, CliRun> {
  constructor(private readonly store: CliRunStore = cliRunStore) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<CliRun> {
    const run = this.store.create(workspaceId);
    if (!run) throw new CliRunAlreadyActiveException({ workspaceId });
    return run;
  }
}
