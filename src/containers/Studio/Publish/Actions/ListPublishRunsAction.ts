import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import type { PublishRun } from "../Models/PublishRun";
import { ListLatestPublishRunsTask } from "../Tasks/ListLatestPublishRunsTask";

/** Lần chạy mới nhất của từng file, để FE dựng lại bảng Sync Activity / chip Header sau khi tải lại trang. */
export class ListPublishRunsAction extends Action<{ workspaceId: string }, PublishRun[]> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly listRuns = new ListLatestPublishRunsTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<PublishRun[]> {
    await this.getWorkspace.run({ workspaceId });
    return this.listRuns.run({ workspaceId });
  }
}
