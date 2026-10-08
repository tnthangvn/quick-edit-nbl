import "server-only";
import { SpecProposedEvent } from "@/ship/contracts/events";
import { eventBus } from "@/ship/engine/eventBus";
import { Task } from "@/ship/parents/Task";
import type { SandboxChange } from "../Models/Sandbox";

type Bus = { emit<T>(name: string, payload: T): void };

/** Đẩy đề xuất sang Diff Review (spec 6.1) qua event SPEC_PROPOSED; container Spec phát ra SSE của workspace. */
export class EmitSpecProposalTask extends Task<{ workspaceId: string; runId: string; change: SandboxChange }> {
  constructor(private readonly bus: Bus = eventBus) {
    super();
  }

  async run({ workspaceId, runId, change }: { workspaceId: string; runId: string; change: SandboxChange }): Promise<void> {
    const event = SpecProposedEvent.parse({
      type: "SPEC_PROPOSED",
      workspaceId,
      file: change.file,
      original: change.original,
      proposed: change.proposed,
      sourceId: runId,
    });
    this.bus.emit(event.type, event);
  }
}
