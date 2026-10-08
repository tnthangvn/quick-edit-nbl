import "server-only";
import { Action } from "@/ship/parents/Action";
import { AssertWorkspaceUniqueTask } from "../../Workspace/Tasks/AssertWorkspaceUniqueTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { UpdateWorkspaceRecordTask } from "../../Workspace/Tasks/UpdateWorkspaceRecordTask";
import { WorkspaceIdMismatchException } from "../Exceptions/WorkspaceIdMismatchException";
import { storageLabelOf, storageTypesOf, type WorkspaceConfig } from "../Models/WorkspaceConfig";
import { WriteWorkspaceConfigTask } from "../Tasks/WriteWorkspaceConfigTask";

/** Lưu Tab 3, 4: ghi config.json rồi đồng bộ các cột hiển thị trong registry (tên, specsDir, loại lưu trữ, notebook). */
export class UpdateWorkspaceConfigAction extends Action<{ workspaceId: string; config: WorkspaceConfig }, WorkspaceConfig> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly assertUnique = new AssertWorkspaceUniqueTask(),
    private readonly writeConfig = new WriteWorkspaceConfigTask(),
    private readonly updateRecord = new UpdateWorkspaceRecordTask(),
  ) {
    super();
  }

  async run({ workspaceId, config }: { workspaceId: string; config: WorkspaceConfig }): Promise<WorkspaceConfig> {
    if (config.workspace.id !== workspaceId) throw new WorkspaceIdMismatchException({ workspaceId });
    const workspace = await this.getWorkspace.run({ workspaceId });
    await this.assertUnique.run({ name: config.workspace.name, excludeId: workspaceId });
    const saved = await this.writeConfig.run({ workspacePath: workspace.path, config });
    await this.updateRecord.run({
      workspaceId,
      patch: {
        name: saved.workspace.name,
        specs_dir: saved.workspace.specsDir,
        storage_type: storageTypesOf(saved.storage),
        storage_label: storageLabelOf(saved),
        notebook_id: saved.nbl.notebookId,
      },
    });
    return saved;
  }
}
