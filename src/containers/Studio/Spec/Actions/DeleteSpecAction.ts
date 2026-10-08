import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { specsLocationOf } from "../Models/SpecFile";
import { DeleteSpecFileTask } from "../Tasks/DeleteSpecFileTask";
import { RecordSpecChangeTask } from "../Tasks/RecordSpecChangeTask";

/** Xoá file spec local (spec 3.2 Context menu). */
export class DeleteSpecAction extends Action<{ workspaceId: string; file: string }, void> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly deleteFile = new DeleteSpecFileTask(),
    private readonly recordChange = new RecordSpecChangeTask(),
  ) {
    super();
  }

  async run({ workspaceId, file }: { workspaceId: string; file: string }): Promise<void> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const name = await this.deleteFile.run({ location: specsLocationOf(ws), file });
    await this.recordChange.run({ workspaceId, file: name, change: "DELETED" });
  }
}
