import "server-only";
import type { StorageType } from "@/ship/contracts/enums/StorageType";
import { Task } from "@/ship/parents/Task";
import { WorkspaceRepository, type WorkspaceSort } from "../Data/Repositories/WorkspaceRepository";
import type { WorkspaceRow } from "../Models/Workspace";

export type SearchWorkspacesInput = { q?: string; storageType?: StorageType; sort: WorkspaceSort };

export class SearchWorkspacesTask extends Task<SearchWorkspacesInput, WorkspaceRow[]> {
  constructor(private readonly repo = new WorkspaceRepository()) {
    super();
  }

  run(input: SearchWorkspacesInput): Promise<WorkspaceRow[]> {
    return this.repo.search(input);
  }
}
