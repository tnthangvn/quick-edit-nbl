import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { specsLocationOf } from "../Models/SpecFile";
import { ReadSpecFileTask, type ReadSpecFileOutput } from "../Tasks/ReadSpecFileTask";

export class GetSpecAction extends Action<{ workspaceId: string; file: string }, ReadSpecFileOutput> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readFile = new ReadSpecFileTask(),
  ) {
    super();
  }

  async run({ workspaceId, file }: { workspaceId: string; file: string }): Promise<ReadSpecFileOutput> {
    const ws = await this.getWorkspace.run({ workspaceId });
    return this.readFile.run({ workspaceId, location: specsLocationOf(ws), file });
  }
}
