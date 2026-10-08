import "server-only";
import { Action } from "@/ship/parents/Action";
import type { AgentSessionRow, AgentSessionRunRow } from "../Models/AgentSession";
import { GetAgentSessionTask } from "../Tasks/GetAgentSessionTask";
import { ListSessionRunsTask } from "../Tasks/ListSessionRunsTask";

/** Một session đầy đủ (tin nhắn API + các run CLI đã lưu) để dựng lại chatbox. */
export class GetAgentSessionAction extends Action<{ sessionId: string }, { session: AgentSessionRow; runs: AgentSessionRunRow[] }> {
  constructor(
    private readonly getSession = new GetAgentSessionTask(),
    private readonly listRuns = new ListSessionRunsTask(),
  ) {
    super();
  }

  async run({ sessionId }: { sessionId: string }): Promise<{ session: AgentSessionRow; runs: AgentSessionRunRow[] }> {
    const session = await this.getSession.run({ sessionId });
    return { session, runs: await this.listRuns.run({ sessionId }) };
  }
}
