import "server-only";
import type { WorkspaceEvent } from "@/ship/contracts/events";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { specsLocationOf } from "../Models/SpecFile";
import { SubscribeWorkspaceEventsTask } from "../Tasks/SubscribeWorkspaceEventsTask";
import { WatchSpecsDirTask } from "../Tasks/WatchSpecsDirTask";

export type StreamWorkspaceEventsInput = { workspaceId: string; onEvent: (event: WorkspaceEvent) => void };

/**
 * Đăng ký nhận WorkspaceEvent của một Workspace (SPEC_CHANGED, SPEC_PROPOSED, PUBLISH_PROGRESS) và bật watcher
 * thư mục spec (dùng chung, đếm tham chiếu). Trả hàm huỷ: gỡ listener, watcher đóng khi không còn subscriber.
 */
export class StreamWorkspaceEventsAction extends Action<StreamWorkspaceEventsInput, () => void> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly subscribe = new SubscribeWorkspaceEventsTask(),
    private readonly watchDir = new WatchSpecsDirTask(),
  ) {
    super();
  }

  async run({ workspaceId, onEvent }: StreamWorkspaceEventsInput): Promise<() => void> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const unsubscribe = await this.subscribe.run({ workspaceId, onEvent });
    try {
      const unwatch = await this.watchDir.run({ workspaceId, location: specsLocationOf(ws) });
      return () => {
        unwatch();
        unsubscribe();
      };
    } catch (err) {
      unsubscribe();
      throw err;
    }
  }
}
