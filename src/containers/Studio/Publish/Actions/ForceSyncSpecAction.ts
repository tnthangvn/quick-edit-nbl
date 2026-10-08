import "server-only";
import type { PublishTarget } from "@/ship/contracts/enums/sync";
import { Action } from "@/ship/parents/Action";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { specsLocationOf } from "../../Spec/Models/SpecFile";
import { GetSpecFileInfoTask } from "../../Spec/Tasks/GetSpecFileInfoTask";
import { RecordSpecChangeTask } from "../../Spec/Tasks/RecordSpecChangeTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import type { PublishRun } from "../Models/PublishRun";
import { CreatePublishRunTask } from "../Tasks/CreatePublishRunTask";
import { PlanPublishTargetsTask } from "../Tasks/PlanPublishTargetsTask";

export type ForceSyncSpecInput = { workspaceId: string; file: string; target?: PublishTarget };

/**
 * Force Sync (Sidebar) / Thử lại (Sync Activity): chạy lại pipeline cho file đang có trên đĩa, bỏ qua các tuỳ chọn
 * tự động. Có `target` → chỉ LOCAL + đích đó (đích chưa cấu hình → PUBLISH.TARGET_NOT_CONFIGURED).
 */
export class ForceSyncSpecAction extends Action<ForceSyncSpecInput, PublishRun> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly getSpecInfo = new GetSpecFileInfoTask(),
    private readonly planTargets = new PlanPublishTargetsTask(),
    private readonly recordChange = new RecordSpecChangeTask(),
    private readonly createRun = new CreatePublishRunTask(),
  ) {
    super();
  }

  async run({ workspaceId, file, target }: ForceSyncSpecInput): Promise<PublishRun> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const info = await this.getSpecInfo.run({ location: specsLocationOf(ws), file });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    const steps = await this.planTargets.run({ config, trigger: "FORCE", only: target });
    await this.recordChange.run({ workspaceId, file: info.file, change: "UPDATED", syncStatus: "SYNCING" });
    return this.createRun.run({ workspaceId, file: info.file, trigger: "FORCE", action: "update", steps });
  }
}
