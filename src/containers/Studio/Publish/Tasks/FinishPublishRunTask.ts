import "server-only";
import { eventBus } from "@/ship/engine/eventBus";
import { Task } from "@/ship/parents/Task";
import { publishRunStore } from "../Data/PublishRunStore";
import { toProgressEvent } from "../Events/progress";
import type { PublishRun } from "../Models/PublishRun";

export type FinishPublishRunOutput = { run: PublishRun; hasError: boolean; pendingForFile: number };

/** Kết thúc lần chạy: finished = true, phát PUBLISH_PROGRESS cuối, trả số lần chạy còn chờ cho cùng file. */
export class FinishPublishRunTask extends Task<{ runId: string }, FinishPublishRunOutput | undefined> {
  async run({ runId }: { runId: string }): Promise<FinishPublishRunOutput | undefined> {
    const run = publishRunStore.get(runId);
    if (!run) return undefined;
    const snapshot = structuredClone(run);
    const pendingForFile = publishRunStore.finish(runId);
    snapshot.finished = true;
    snapshot.finishedAt = new Date().toISOString();
    eventBus.emit("PUBLISH_PROGRESS", toProgressEvent(snapshot));
    return { run: snapshot, hasError: snapshot.steps.some((s) => s.status === "ERROR"), pendingForFile };
  }
}
