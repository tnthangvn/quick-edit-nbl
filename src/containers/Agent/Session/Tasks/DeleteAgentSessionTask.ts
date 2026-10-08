import "server-only";
import { Task } from "@/ship/parents/Task";
import { AgentSessionRepository } from "../Data/Repositories/AgentSessionRepository";
import { AgentSessionRunRepository } from "../Data/Repositories/AgentSessionRunRepository";

/** Xoá session và các run đã lưu (driver JSON không có ON DELETE CASCADE nên xoá run trước). */
export class DeleteAgentSessionTask extends Task<{ sessionId: string }> {
  constructor(
    private readonly sessions = new AgentSessionRepository(),
    private readonly runs = new AgentSessionRunRepository(),
  ) {
    super();
  }

  async run({ sessionId }: { sessionId: string }): Promise<void> {
    await this.runs.removeBySession(sessionId);
    await this.sessions.remove(sessionId);
  }
}
