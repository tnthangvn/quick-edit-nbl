import "server-only";
import { Task } from "@/ship/parents/Task";
import { AgentSessionRunRepository } from "../Data/Repositories/AgentSessionRunRepository";
import type { AgentSessionRunRow } from "../Models/AgentSession";

export class ListSessionRunsTask extends Task<{ sessionId: string }, AgentSessionRunRow[]> {
  constructor(private readonly repo = new AgentSessionRunRepository()) {
    super();
  }

  run({ sessionId }: { sessionId: string }): Promise<AgentSessionRunRow[]> {
    return this.repo.listBySession(sessionId);
  }
}
