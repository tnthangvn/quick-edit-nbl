import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { specsLocationOf, type SpecFileWithStatus } from "../Models/SpecFile";
import { RecordSpecChangeTask } from "../Tasks/RecordSpecChangeTask";
import { WriteSpecFileTask } from "../Tasks/WriteSpecFileTask";

export type CreateSpecInput = { workspaceId: string; file: string; content: string };

/** Tạo file spec mới (đã tồn tại → SPEC.ALREADY_EXISTS). Không chạy pipeline publish. */
export class CreateSpecAction extends Action<CreateSpecInput, SpecFileWithStatus & { content: string }> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly writeFile = new WriteSpecFileTask(),
    private readonly recordChange = new RecordSpecChangeTask(),
  ) {
    super();
  }

  async run({ workspaceId, file, content }: CreateSpecInput): Promise<SpecFileWithStatus & { content: string }> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const { info } = await this.writeFile.run({ location: specsLocationOf(ws), file, content, mode: "create" });
    const syncStatus = await this.recordChange.run({ workspaceId, file: info.file, change: "CREATED" });
    return { ...info, syncStatus, content };
  }
}
