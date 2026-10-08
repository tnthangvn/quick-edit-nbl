import "server-only";
import type { NewRow } from "@/ship/contracts/data";
import { RepositoryBase } from "@/ship/parents/RepositoryBase";
import type { AgentSessionRunRow } from "../../Models/AgentSession";

export class AgentSessionRunRepository extends RepositoryBase<"agent_session_runs"> {
  protected readonly model = "agent_session_runs" as const;

  create(row: NewRow<"agent_session_runs">): Promise<AgentSessionRunRow> {
    return this.insert(row);
  }

  listBySession(sessionId: string): Promise<AgentSessionRunRow[]> {
    return this.findMany({ session_id: sessionId }, { orderBy: [["created_at", "asc"]] });
  }

  removeBySession(sessionId: string): Promise<number> {
    return this.delete({ session_id: sessionId });
  }
}
