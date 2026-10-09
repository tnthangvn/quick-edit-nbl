import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { REVEALABLE_WORKSPACE_SECRETS, workspaceSecretRef, type WorkspaceSecretKind } from "../Enums/WorkspaceSecretKind";
import { SecretNotRevealableException } from "../Exceptions/SecretNotRevealableException";
import { SecretNotSetException } from "../Exceptions/SecretNotSetException";
import { ReadSecretTask } from "../Tasks/ReadSecretTask";

/** Nút Hiện của secret Workspace do người dùng nhập (cookie / token NotebookLM, PAT Git). */
export class RevealWorkspaceSecretAction extends Action<{ workspaceId: string; kind: WorkspaceSecretKind }, { value: string }> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readSecret = new ReadSecretTask(),
  ) {
    super();
  }

  async run({ workspaceId, kind }: { workspaceId: string; kind: WorkspaceSecretKind }): Promise<{ value: string }> {
    if (!REVEALABLE_WORKSPACE_SECRETS.includes(kind)) throw new SecretNotRevealableException({ kind });
    await this.getWorkspace.run({ workspaceId });
    const value = await this.readSecret.run({ ref: workspaceSecretRef(workspaceId, kind) });
    if (!value) throw new SecretNotSetException({ kind });
    return { value };
  }
}
