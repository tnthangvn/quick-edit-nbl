import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { specsLocationOf, type SpecFileWithStatus } from "../Models/SpecFile";
import { RecordSpecChangeTask } from "../Tasks/RecordSpecChangeTask";
import { RenameSpecFileTask } from "../Tasks/RenameSpecFileTask";

export type RenameSpecInput = { workspaceId: string; file: string; newFile: string };

/** Đổi tên file spec local (Git / Drive / NotebookLM cập nhật ở lần publish sau). */
export class RenameSpecAction extends Action<RenameSpecInput, SpecFileWithStatus> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly renameFile = new RenameSpecFileTask(),
    private readonly recordChange = new RecordSpecChangeTask(),
  ) {
    super();
  }

  async run({ workspaceId, file, newFile }: RenameSpecInput): Promise<SpecFileWithStatus> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const { from, info } = await this.renameFile.run({ location: specsLocationOf(ws), from: file, to: newFile });
    if (from === info.file) return { ...info, syncStatus: await this.recordChange.run({ workspaceId, file: info.file, change: "UPDATED" }) };
    await this.recordChange.run({ workspaceId, file: from, change: "DELETED" });
    const syncStatus = await this.recordChange.run({ workspaceId, file: info.file, change: "CREATED" });
    return { ...info, syncStatus };
  }
}
