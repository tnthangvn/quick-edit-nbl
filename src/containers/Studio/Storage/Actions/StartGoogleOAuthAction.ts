import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { googleSecretTargetRef } from "../Models/googleSecret";
import { StartGoogleOAuthTask } from "../Tasks/StartGoogleOAuthTask";

export type StartGoogleOAuthInput = { redirectUri: string; workspaceId?: string };

/** Bắt đầu đăng nhập Google cho Drive. Có workspaceId → token lưu riêng cho Workspace, không có → dùng chung (vd Wizard). */
export class StartGoogleOAuthAction extends Action<StartGoogleOAuthInput, { authUrl: string }> {
  constructor(
    private readonly start = new StartGoogleOAuthTask(),
    private readonly getWorkspace = new GetWorkspaceTask(),
  ) {
    super();
  }

  async run({ redirectUri, workspaceId }: StartGoogleOAuthInput): Promise<{ authUrl: string }> {
    if (workspaceId) await this.getWorkspace.run({ workspaceId }); // WORKSPACE.NOT_FOUND (404)
    return this.start.run({ redirectUri, secretRef: googleSecretTargetRef(workspaceId) });
  }
}
