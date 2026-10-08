import "server-only";
import { Action } from "@/ship/parents/Action";
import { GetGoogleOAuthStatusTask } from "../Tasks/GetGoogleOAuthStatusTask";

export class GetGoogleOAuthStatusAction extends Action<{ workspaceId?: string }, { configured: boolean; connected: boolean }> {
  constructor(private readonly status = new GetGoogleOAuthStatusTask()) {
    super();
  }

  run(input: { workspaceId?: string }): Promise<{ configured: boolean; connected: boolean }> {
    return this.status.run(input);
  }
}
