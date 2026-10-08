import "server-only";
import { SPEC_APPROVED, type SpecApprovedPayload } from "@/ship/contracts/events";
import { eventBus } from "@/ship/engine/eventBus";
import { Action } from "@/ship/parents/Action";
import { CreatePublishRunTask } from "../../Publish/Tasks/CreatePublishRunTask";
import { PlanPublishTargetsTask } from "../../Publish/Tasks/PlanPublishTargetsTask";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { specsLocationOf, type SpecFileWithStatus } from "../Models/SpecFile";
import { RecordSpecChangeTask } from "../Tasks/RecordSpecChangeTask";
import { WriteSpecFileTask } from "../Tasks/WriteSpecFileTask";

export type ApproveSpecInput = { workspaceId: string; file: string; content: string };
export type ApproveSpecOutput = { spec: SpecFileWithStatus & { content: string }; runId: string };

/**
 * Approve & Save (spec 6.1, 6.4): ghi file nguyên tử (luôn luôn, đồng bộ trong request), rồi xếp pipeline publish
 * (LOCAL → GIT → DRIVE → NOTEBOOK theo cấu hình) chạy nền; trả runId để FE theo dõi qua SSE PUBLISH_PROGRESS.
 * Chưa có file thì tạo mới (Agent có thể đề xuất file mới).
 */
export class ApproveSpecAction extends Action<ApproveSpecInput, ApproveSpecOutput> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly planTargets = new PlanPublishTargetsTask(),
    private readonly writeFile = new WriteSpecFileTask(),
    private readonly recordChange = new RecordSpecChangeTask(),
    private readonly createRun = new CreatePublishRunTask(),
  ) {
    super();
  }

  async run({ workspaceId, file, content }: ApproveSpecInput): Promise<ApproveSpecOutput> {
    const ws = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: ws.path });
    const steps = await this.planTargets.run({ config, trigger: "APPROVE" });

    const { info, created } = await this.writeFile.run({ location: specsLocationOf(ws), file, content, mode: "upsert" });
    const syncStatus = await this.recordChange.run({ workspaceId, file: info.file, change: created ? "CREATED" : "UPDATED", syncStatus: "SYNCING" });
    eventBus.emit<SpecApprovedPayload>(SPEC_APPROVED, { workspaceId, file: info.file, content });

    const run = await this.createRun.run({ workspaceId, file: info.file, trigger: "APPROVE", action: created ? "add" : "update", steps });
    return { spec: { ...info, syncStatus, content }, runId: run.runId };
  }
}
