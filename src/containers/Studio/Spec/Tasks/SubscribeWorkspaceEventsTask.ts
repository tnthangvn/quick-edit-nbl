import "server-only";
import type { WorkspaceEvent } from "@/ship/contracts/events";
import { eventBus } from "@/ship/engine/eventBus";
import { Task } from "@/ship/parents/Task";

export type SubscribeWorkspaceEventsInput = { workspaceId: string; onEvent: (event: WorkspaceEvent) => void };

const EVENT_TYPES: WorkspaceEvent["type"][] = ["SPEC_CHANGED", "SPEC_PROPOSED", "PUBLISH_PROGRESS"];

/** Nghe eventBus (tên event = trường `type`) và chỉ chuyển event của đúng Workspace. Trả hàm huỷ. */
export class SubscribeWorkspaceEventsTask extends Task<SubscribeWorkspaceEventsInput, () => void> {
  async run({ workspaceId, onEvent }: SubscribeWorkspaceEventsInput): Promise<() => void> {
    const offs = EVENT_TYPES.map((type) =>
      eventBus.on<WorkspaceEvent>(type, (event) => {
        if (event.workspaceId === workspaceId) onEvent(event);
      }),
    );
    return () => offs.forEach((off) => off());
  }
}
