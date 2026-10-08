import "server-only";
import { Task } from "@/ship/parents/Task";
import { publishRunStore } from "../Data/PublishRunStore";
import type { PublishRun } from "../Models/PublishRun";

export class GetPublishRunTask extends Task<{ runId: string }, PublishRun | undefined> {
  async run({ runId }: { runId: string }): Promise<PublishRun | undefined> {
    const run = publishRunStore.get(runId);
    return run && structuredClone(run);
  }
}
