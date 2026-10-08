import "server-only";
import { Task } from "@/ship/parents/Task";
import { WorkspaceRepository } from "../Data/Repositories/WorkspaceRepository";
import { WorkspaceNotFoundException } from "../Exceptions/WorkspaceNotFoundException";
import type { WorkspaceRow } from "../Models/Workspace";

/** Lấy Workspace theo id, không có thì ném WORKSPACE.NOT_FOUND. Dùng chung cho mọi container trong Section Studio. */
export class GetWorkspaceTask extends Task<{ workspaceId: string }, WorkspaceRow> {
  constructor(private readonly repo = new WorkspaceRepository()) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<WorkspaceRow> {
    const ws = await this.repo.findByIdOrNull(workspaceId);
    if (!ws) throw new WorkspaceNotFoundException({ workspaceId });
    return ws;
  }
}
