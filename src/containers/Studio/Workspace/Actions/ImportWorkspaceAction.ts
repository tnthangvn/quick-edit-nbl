import "server-only";
import { Action } from "@/ship/parents/Action";
import { storageLabelOf } from "../../Setting/Models/WorkspaceConfig";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { WriteWorkspaceConfigTask } from "../../Setting/Tasks/WriteWorkspaceConfigTask";
import { WorkspaceConfigNotFoundException } from "../Exceptions/WorkspaceConfigNotFoundException";
import { WorkspaceFolderNotFoundException } from "../Exceptions/WorkspaceFolderNotFoundException";
import type { WorkspaceRow } from "../Models/Workspace";
import { AssertWorkspaceUniqueTask } from "../Tasks/AssertWorkspaceUniqueTask";
import { CreateWorkspaceRecordTask } from "../Tasks/CreateWorkspaceRecordTask";
import { InspectFolderTask } from "../Tasks/InspectFolderTask";

/**
 * "Mở thư mục có sẵn" (spec 3.0): thêm thư mục đã có .spec-studio/config.json vào registry, giữ nguyên id trong config
 * (secret tham chiếu theo id). `name` dùng khi tên trong config đã trùng Workspace khác.
 */
export class ImportWorkspaceAction extends Action<{ path: string; name?: string }, WorkspaceRow> {
  constructor(
    private readonly inspectFolder = new InspectFolderTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly assertUnique = new AssertWorkspaceUniqueTask(),
    private readonly writeConfig = new WriteWorkspaceConfigTask(),
    private readonly createRecord = new CreateWorkspaceRecordTask(),
  ) {
    super();
  }

  async run({ path, name }: { path: string; name?: string }): Promise<WorkspaceRow> {
    if (!(await this.inspectFolder.run({ path })).isDirectory) throw new WorkspaceFolderNotFoundException({ path });
    let config = await this.readConfig.run({ workspacePath: path });
    if (!config) throw new WorkspaceConfigNotFoundException({ path });

    const finalName = name ?? config.workspace.name;
    await this.assertUnique.run({ id: config.workspace.id, path, name: finalName });
    if (finalName !== config.workspace.name) {
      config = await this.writeConfig.run({ workspacePath: path, config: { ...config, workspace: { ...config.workspace, name: finalName } } });
    }

    return this.createRecord.run({
      id: config.workspace.id,
      name: finalName,
      description: null,
      path,
      specs_dir: config.workspace.specsDir,
      storage_type: config.storage.type,
      storage_label: storageLabelOf(config),
      notebook_id: config.nbl.notebookId,
      status: "ACTIVE",
      last_opened_at: null,
    });
  }
}
