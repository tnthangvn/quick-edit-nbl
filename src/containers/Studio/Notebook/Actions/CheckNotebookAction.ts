import "server-only";
import type { SyncStrategy } from "@/ship/contracts/enums/sync";
import { Action } from "@/ship/parents/Action";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { NotebookNotConfiguredException } from "../Exceptions/NotebookNotConfiguredException";
import { CheckNotebookTask, type CheckNotebookTaskOutput } from "../Tasks/CheckNotebookTask";

export type CheckNotebookInput = { workspaceId: string; notebookId?: string; syncStrategy?: SyncStrategy };

/** Nút Kiểm tra (Settings Tab 3): notebook truyền vào hoặc notebook đã cấu hình của Workspace. */
export class CheckNotebookAction extends Action<CheckNotebookInput, CheckNotebookTaskOutput & { notebookId: string }> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly check = new CheckNotebookTask(),
  ) {
    super();
  }

  async run({ workspaceId, notebookId, syncStrategy }: CheckNotebookInput): Promise<CheckNotebookTaskOutput & { notebookId: string }> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const nbl = (await this.readConfig.run({ workspacePath: ws.path }))?.nbl;
    const id = notebookId ?? nbl?.notebookId ?? ws.notebook_id;
    if (!id) throw new NotebookNotConfiguredException();
    const result = await this.check.run({ notebookId: id, syncStrategy: syncStrategy ?? nbl?.syncStrategy ?? "RPC", workspaceId });
    return { ...result, notebookId: id };
  }
}
