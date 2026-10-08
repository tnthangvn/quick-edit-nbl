import "server-only";
import { studio } from "@/containers/providers";
import type { SpecAccess } from "@/ship/contracts/studioAccess";
import { Action } from "@/ship/parents/Action";
import type { AgentSessionRow } from "../Models/AgentSession";
import { CreateAgentSessionTask } from "../Tasks/CreateAgentSessionTask";

/** Mở một phiên chat mới với Agent trong Workspace (nút New session / lượt gửi đầu tiên). */
export class CreateAgentSessionAction extends Action<{ workspaceId: string }, AgentSessionRow> {
  constructor(
    private readonly specs: SpecAccess = studio.specs(),
    private readonly create = new CreateAgentSessionTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<AgentSessionRow> {
    await this.specs.getWorkspace(workspaceId);
    return this.create.run({ workspaceId });
  }
}
