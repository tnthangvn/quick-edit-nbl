import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { googleSecretTargetRef } from "../Models/googleSecret";
import { DisconnectGoogleOAuthTask } from "../Tasks/DisconnectGoogleOAuthTask";
import { GetGoogleOAuthStatusTask } from "../Tasks/GetGoogleOAuthStatusTask";

/** Đăng xuất Google cho Drive. Có workspaceId → xoá token riêng của Workspace, không có → xoá token dùng chung (Settings › Integrations). */
export class DisconnectGoogleOAuthAction extends Action<{ workspaceId?: string }, { configured: boolean; connected: boolean }> {
  constructor(
    private readonly disconnect = new DisconnectGoogleOAuthTask(),
    private readonly status = new GetGoogleOAuthStatusTask(),
    private readonly getWorkspace = new GetWorkspaceTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId?: string }): Promise<{ configured: boolean; connected: boolean }> {
    if (workspaceId) await this.getWorkspace.run({ workspaceId }); // WORKSPACE.NOT_FOUND (404)
    await this.disconnect.run({ secretRef: googleSecretTargetRef(workspaceId) });
    return this.status.run({ workspaceId });
  }
}
