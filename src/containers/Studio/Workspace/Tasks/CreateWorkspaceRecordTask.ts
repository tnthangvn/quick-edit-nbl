import "server-only";
import type { NewRow } from "@/ship/contracts/data";
import { Task } from "@/ship/parents/Task";
import { WorkspaceRepository } from "../Data/Repositories/WorkspaceRepository";
import type { WorkspaceRow } from "../Models/Workspace";

/** Thêm bản ghi vào registry Workspace. */
export class CreateWorkspaceRecordTask extends Task<NewRow<"workspaces">, WorkspaceRow> {
  constructor(private readonly repo = new WorkspaceRepository()) {
    super();
  }

  run(row: NewRow<"workspaces">): Promise<WorkspaceRow> {
    return this.repo.create(row);
  }
}
