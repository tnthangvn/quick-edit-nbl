import "server-only";
import { Action } from "@/ship/parents/Action";
import type { AgentSessionRow } from "../Models/AgentSession";
import { ListAgentSessionsTask } from "../Tasks/ListAgentSessionsTask";

/** History: các session của Workspace, mới dùng gần nhất trước. */
export class ListAgentSessionsAction extends Action<{ workspaceId: string }, AgentSessionRow[]> {
  constructor(private readonly list = new ListAgentSessionsTask()) {
    super();
  }

  run({ workspaceId }: { workspaceId: string }): Promise<AgentSessionRow[]> {
    return this.list.run({ workspaceId });
  }
}
