import "server-only";
import type { RowPatch } from "@/ship/contracts/data";
import { Task } from "@/ship/parents/Task";
import { WorkspaceRepository } from "../Data/Repositories/WorkspaceRepository";
import { WorkspaceNotFoundException } from "../Exceptions/WorkspaceNotFoundException";
import type { WorkspaceRow } from "../Models/Workspace";

export type UpdateWorkspaceRecordInput = { workspaceId: string; patch: RowPatch<"workspaces"> };

/** Sửa bản ghi registry (tên, đường dẫn, trạng thái, last_opened_at...). */
export class UpdateWorkspaceRecordTask extends Task<UpdateWorkspaceRecordInput, WorkspaceRow> {
  constructor(private readonly repo = new WorkspaceRepository()) {
    super();
  }

  async run({ workspaceId, patch }: UpdateWorkspaceRecordInput): Promise<WorkspaceRow> {
    const row = await this.repo.patch(workspaceId, patch);
    if (!row) throw new WorkspaceNotFoundException({ workspaceId });
    return row;
  }
}
