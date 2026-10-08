import "server-only";
import { Task } from "@/ship/parents/Task";
import { WorkspaceRepository } from "../Data/Repositories/WorkspaceRepository";
import { WorkspaceNotFoundException } from "../Exceptions/WorkspaceNotFoundException";

/** Gỡ Workspace khỏi registry. Không đụng tới file trên đĩa. */
export class DeleteWorkspaceRecordTask extends Task<{ workspaceId: string }, void> {
  constructor(private readonly repo = new WorkspaceRepository()) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<void> {
    if (!(await this.repo.remove(workspaceId))) throw new WorkspaceNotFoundException({ workspaceId });
  }
}
