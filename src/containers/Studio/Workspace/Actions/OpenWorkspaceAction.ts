import "server-only";
import { Action } from "@/ship/parents/Action";
import type { WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { WorkspaceFolderMissingException } from "../Exceptions/WorkspaceFolderMissingException";
import type { WorkspaceRow } from "../Models/Workspace";
import { GetWorkspaceTask } from "../Tasks/GetWorkspaceTask";
import { RefreshWorkspaceStatusTask } from "../Tasks/RefreshWorkspaceStatusTask";
import { UpdateWorkspaceRecordTask } from "../Tasks/UpdateWorkspaceRecordTask";

export type OpenedWorkspace = { workspace: WorkspaceRow; config: WorkspaceConfig | null };

/** Mở Workspace (route /w/[id]): ghi last_opened_at, trả kèm config.json. Thư mục mất → WORKSPACE.FOLDER_MISSING. */
export class OpenWorkspaceAction extends Action<{ workspaceId: string }, OpenedWorkspace> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly refreshStatus = new RefreshWorkspaceStatusTask(),
    private readonly updateRecord = new UpdateWorkspaceRecordTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<OpenedWorkspace> {
    const [current] = await this.refreshStatus.run({ rows: [await this.getWorkspace.run({ workspaceId })] });
    if (current.status === "FOLDER_MISSING") throw new WorkspaceFolderMissingException({ path: current.path });
    const workspace = await this.updateRecord.run({ workspaceId, patch: { last_opened_at: new Date().toISOString() } });
    const config = (await this.readConfig.run({ workspacePath: workspace.path })) ?? null;
    return { workspace, config };
  }
}
