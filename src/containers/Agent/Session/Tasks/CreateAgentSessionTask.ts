import "server-only";
import { Task } from "@/ship/parents/Task";
import { AgentSessionRepository } from "../Data/Repositories/AgentSessionRepository";
import type { AgentSessionRow } from "../Models/AgentSession";

export class CreateAgentSessionTask extends Task<{ workspaceId: string }, AgentSessionRow> {
  constructor(private readonly repo = new AgentSessionRepository()) {
    super();
  }

  run({ workspaceId }: { workspaceId: string }): Promise<AgentSessionRow> {
    return this.repo.create(workspaceId);
  }
}
