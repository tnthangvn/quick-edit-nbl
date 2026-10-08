import "server-only";
import { Task } from "@/ship/parents/Task";
import { publishRunStore } from "../Data/PublishRunStore";
import type { PublishRun } from "../Models/PublishRun";

/** Lần chạy mới nhất của từng file trong Workspace, mới nhất trước. */
export class ListLatestPublishRunsTask extends Task<{ workspaceId: string }, PublishRun[]> {
  async run({ workspaceId }: { workspaceId: string }): Promise<PublishRun[]> {
    return structuredClone(publishRunStore.latestFor(workspaceId));
  }
}
