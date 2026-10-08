import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { workspaceSecretRef, type WorkspaceSecretKind } from "../Enums/WorkspaceSecretKind";
import { WriteSecretTask } from "../Tasks/WriteSecretTask";

/** Ghi (value) hoặc xoá (value = null) một secret của Workspace. */
export class WriteWorkspaceSecretAction extends Action<{ workspaceId: string; kind: WorkspaceSecretKind; value: string | null }, void> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly writeSecret = new WriteSecretTask(),
  ) {
    super();
  }

  async run({ workspaceId, kind, value }: { workspaceId: string; kind: WorkspaceSecretKind; value: string | null }): Promise<void> {
    await this.getWorkspace.run({ workspaceId });
    await this.writeSecret.run({ ref: workspaceSecretRef(workspaceId, kind), value });
  }
}
