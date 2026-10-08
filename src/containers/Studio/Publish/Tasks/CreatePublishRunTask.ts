import "server-only";
import { v7 as uuidv7 } from "uuid";
import type { PublishStep } from "@/ship/contracts/events";
import { eventBus } from "@/ship/engine/eventBus";
import { Task } from "@/ship/parents/Task";
import { publishRunStore } from "../Data/PublishRunStore";
import { PUBLISH_RUN_QUEUED, type PublishRunQueuedPayload, ensurePublishRunHandler } from "../Events/PublishRunQueuedHandler";
import { toProgressEvent } from "../Events/progress";
import type { PublishRun, PublishTrigger } from "../Models/PublishRun";

export type CreatePublishRunInput = {
  workspaceId: string;
  file: string;
  trigger: PublishTrigger;
  action: PublishRun["action"];
  steps: PublishStep[];
};

/**
 * Tạo một lần chạy pipeline, phát PUBLISH_PROGRESS (mọi bước PENDING) và xếp vào hàng đợi theo file:
 * handler chạy lần lượt, không bao giờ hai pipeline cùng lúc cho một file.
 */
export class CreatePublishRunTask extends Task<CreatePublishRunInput, PublishRun> {
  async run(input: CreatePublishRunInput): Promise<PublishRun> {
    ensurePublishRunHandler();
    const run: PublishRun = { runId: uuidv7(), ...input, finished: false, createdAt: new Date().toISOString(), finishedAt: null };
    publishRunStore.add(run);
    eventBus.emit("PUBLISH_PROGRESS", toProgressEvent(run));
    eventBus.emit<PublishRunQueuedPayload>(PUBLISH_RUN_QUEUED, { runId: run.runId, workspaceId: run.workspaceId, file: run.file });
    return structuredClone(run);
  }
}
