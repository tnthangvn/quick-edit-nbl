import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { WorkspaceSecretKind, workspaceSecretRef } from "../Enums/WorkspaceSecretKind";
import { CheckSecretsPresenceTask } from "../Tasks/CheckSecretsPresenceTask";

export type WorkspaceSecretState = { kind: WorkspaceSecretKind; isSet: boolean };

/** Loại secret nào của Workspace đã nhập (chỉ boolean). */
export class ListWorkspaceSecretsAction extends Action<{ workspaceId: string }, WorkspaceSecretState[]> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly checkSecrets = new CheckSecretsPresenceTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<WorkspaceSecretState[]> {
    await this.getWorkspace.run({ workspaceId });
    const kinds = WorkspaceSecretKind.options;
    const present = await this.checkSecrets.run({ refs: kinds.map((k) => workspaceSecretRef(workspaceId, k)) });
    return kinds.map((kind) => ({ kind, isSet: present[workspaceSecretRef(workspaceId, kind)] }));
  }
}
