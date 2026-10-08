import "server-only";
import type { RowPatch } from "@/ship/contracts/data";
import { Action } from "@/ship/parents/Action";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { WriteWorkspaceConfigTask } from "../../Setting/Tasks/WriteWorkspaceConfigTask";
import { WorkspaceConfigNotFoundException } from "../Exceptions/WorkspaceConfigNotFoundException";
import { WorkspaceFolderNotFoundException } from "../Exceptions/WorkspaceFolderNotFoundException";
import type { WorkspaceRow } from "../Models/Workspace";
import { AssertWorkspaceUniqueTask } from "../Tasks/AssertWorkspaceUniqueTask";
import { GetWorkspaceTask } from "../Tasks/GetWorkspaceTask";
import { InspectFolderTask } from "../Tasks/InspectFolderTask";
import { UpdateWorkspaceRecordTask } from "../Tasks/UpdateWorkspaceRecordTask";

export type UpdateWorkspaceInput = { workspaceId: string; name?: string; description?: string | null; path?: string };

/**
 * Đổi tên / mô tả, hoặc "Tìm lại" thư mục (path mới phải có .spec-studio/config.json).
 * Đổi tên thì ghi luôn vào config.json (nguồn sự thật) nếu thư mục còn.
 */
export class UpdateWorkspaceAction extends Action<UpdateWorkspaceInput, WorkspaceRow> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly assertUnique = new AssertWorkspaceUniqueTask(),
    private readonly inspectFolder = new InspectFolderTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly updateRecord = new UpdateWorkspaceRecordTask(),
    private readonly writeConfig = new WriteWorkspaceConfigTask(),
  ) {
    super();
  }

  async run({ workspaceId, name, description, path }: UpdateWorkspaceInput): Promise<WorkspaceRow> {
    const current = await this.getWorkspace.run({ workspaceId });
    const patch: RowPatch<"workspaces"> = {};

    if (name !== undefined && name !== current.name) {
      await this.assertUnique.run({ name, excludeId: workspaceId });
      patch.name = name;
    }
    if (description !== undefined) patch.description = description;
    if (path !== undefined && path !== current.path) {
      const folder = await this.inspectFolder.run({ path });
      if (!folder.isDirectory) throw new WorkspaceFolderNotFoundException({ path });
      if (!(await this.readConfig.run({ workspacePath: path }))) throw new WorkspaceConfigNotFoundException({ path });
      await this.assertUnique.run({ path, excludeId: workspaceId });
      Object.assign(patch, { path, status: "ACTIVE" });
    }

    const row = await this.updateRecord.run({ workspaceId, patch });
    if (patch.name) await this.renameInConfig(row);
    return row;
  }

  private async renameInConfig(row: WorkspaceRow) {
    if (!(await this.inspectFolder.run({ path: row.path })).hasConfig) return;
    const config = await this.readConfig.run({ workspacePath: row.path });
    if (config) await this.writeConfig.run({ workspacePath: row.path, config: { ...config, workspace: { ...config.workspace, name: row.name } } });
  }
}
