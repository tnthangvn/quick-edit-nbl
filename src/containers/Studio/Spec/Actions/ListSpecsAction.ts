import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { specsLocationOf, type SpecFileWithStatus } from "../Models/SpecFile";
import { ListSpecFilesTask } from "../Tasks/ListSpecFilesTask";

/** Danh sách file spec cho Sidebar (spec 3.2). */
export class ListSpecsAction extends Action<{ workspaceId: string }, SpecFileWithStatus[]> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly listFiles = new ListSpecFilesTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<SpecFileWithStatus[]> {
    const ws = await this.getWorkspace.run({ workspaceId });
    return this.listFiles.run({ workspaceId, location: specsLocationOf(ws) });
  }
}
