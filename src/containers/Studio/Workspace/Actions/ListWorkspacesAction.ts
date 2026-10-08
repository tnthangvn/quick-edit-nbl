import "server-only";
import { Action } from "@/ship/parents/Action";
import type { WorkspaceRow } from "../Models/Workspace";
import { RefreshWorkspaceStatusTask } from "../Tasks/RefreshWorkspaceStatusTask";
import { SearchWorkspacesTask, type SearchWorkspacesInput } from "../Tasks/SearchWorkspacesTask";

/** Danh sách Workspace cho màn hình Projects (spec 3.0), kèm dò lại thư mục bị xoá / di chuyển. */
export class ListWorkspacesAction extends Action<SearchWorkspacesInput, WorkspaceRow[]> {
  constructor(
    private readonly searchWorkspaces = new SearchWorkspacesTask(),
    private readonly refreshStatus = new RefreshWorkspaceStatusTask(),
  ) {
    super();
  }

  async run(input: SearchWorkspacesInput): Promise<WorkspaceRow[]> {
    return this.refreshStatus.run({ rows: await this.searchWorkspaces.run(input) });
  }
}
