import "server-only";
import type { PublishTarget } from "@/ship/contracts/enums/sync";
import type { PublishStep } from "@/ship/contracts/events";
import { eventBus } from "@/ship/engine/eventBus";
import { Task } from "@/ship/parents/Task";
import { publishRunStore } from "../Data/PublishRunStore";
import { toProgressEvent } from "../Events/progress";

export type UpdatePublishStepInput = { runId: string; target: PublishTarget; patch: Partial<Omit<PublishStep, "target">> };

/** Cập nhật một bước của lần chạy và phát PUBLISH_PROGRESS với toàn bộ các bước. */
export class UpdatePublishStepTask extends Task<UpdatePublishStepInput, void> {
  async run({ runId, target, patch }: UpdatePublishStepInput): Promise<void> {
    const run = publishRunStore.update(runId, (r) => {
      const s = r.steps.find((x) => x.target === target);
      if (s) Object.assign(s, patch);
    });
    if (run) eventBus.emit("PUBLISH_PROGRESS", toProgressEvent(run));
  }
}
