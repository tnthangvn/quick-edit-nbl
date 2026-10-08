import "server-only";
import { Task } from "@/ship/parents/Task";
import { AgentSessionRepository } from "../Data/Repositories/AgentSessionRepository";
import { AgentSessionNotFoundException } from "../Exceptions/AgentSessionNotFoundException";
import type { AgentSessionRow } from "../Models/AgentSession";

/** Session theo id; có `workspaceId` thì phải thuộc đúng Workspace đó (không lộ session của Workspace khác). */
export class GetAgentSessionTask extends Task<{ sessionId: string; workspaceId?: string }, AgentSessionRow> {
  constructor(private readonly repo = new AgentSessionRepository()) {
    super();
  }

  async run({ sessionId, workspaceId }: { sessionId: string; workspaceId?: string }): Promise<AgentSessionRow> {
    const session = await this.repo.findByIdOrNull(sessionId);
    if (!session || (workspaceId && session.workspace_id !== workspaceId)) throw new AgentSessionNotFoundException({ sessionId });
    return session;
  }
}
