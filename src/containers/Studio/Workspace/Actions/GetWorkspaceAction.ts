import "server-only";
import { Action } from "@/ship/parents/Action";
import type { WorkspaceRow } from "../Models/Workspace";
import { GetWorkspaceTask } from "../Tasks/GetWorkspaceTask";
import { RefreshWorkspaceStatusTask } from "../Tasks/RefreshWorkspaceStatusTask";

export class GetWorkspaceAction extends Action<{ workspaceId: string }, WorkspaceRow> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly refreshStatus = new RefreshWorkspaceStatusTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<WorkspaceRow> {
    const [row] = await this.refreshStatus.run({ rows: [await this.getWorkspace.run({ workspaceId })] });
    return row;
  }
}
