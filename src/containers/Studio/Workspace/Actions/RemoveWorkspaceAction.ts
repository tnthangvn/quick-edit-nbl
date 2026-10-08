import "server-only";
import { Action } from "@/ship/parents/Action";
import { DeleteWorkspaceRecordTask } from "../Tasks/DeleteWorkspaceRecordTask";

/** Gỡ Workspace khỏi danh sách (spec 3.0): chỉ xoá bản ghi registry, không bao giờ xoá file. */
export class RemoveWorkspaceAction extends Action<{ workspaceId: string }, void> {
  constructor(private readonly deleteRecord = new DeleteWorkspaceRecordTask()) {
    super();
  }

  run({ workspaceId }: { workspaceId: string }): Promise<void> {
    return this.deleteRecord.run({ workspaceId });
  }
}
