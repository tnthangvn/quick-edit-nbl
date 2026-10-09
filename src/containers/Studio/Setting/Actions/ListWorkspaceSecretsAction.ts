import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { REVEALABLE_WORKSPACE_SECRETS, WorkspaceSecretKind, workspaceSecretRef } from "../Enums/WorkspaceSecretKind";
import { MaskSecretsTask } from "../Tasks/MaskSecretsTask";

export type WorkspaceSecretState = { kind: WorkspaceSecretKind; isSet: boolean; masked: string | null; revealable: boolean };

/** Loại secret nào của Workspace đã nhập, kèm bản che (không bao giờ plaintext). */
export class ListWorkspaceSecretsAction extends Action<{ workspaceId: string }, WorkspaceSecretState[]> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly maskSecrets = new MaskSecretsTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<WorkspaceSecretState[]> {
    await this.getWorkspace.run({ workspaceId });
    const kinds = WorkspaceSecretKind.options;
    const masked = await this.maskSecrets.run({ refs: kinds.map((k) => workspaceSecretRef(workspaceId, k)) });
    return kinds.map((kind) => {
      const value = masked[workspaceSecretRef(workspaceId, kind)];
      return { kind, isSet: value !== null, masked: value, revealable: REVEALABLE_WORKSPACE_SECRETS.includes(kind) };
    });
  }
}
