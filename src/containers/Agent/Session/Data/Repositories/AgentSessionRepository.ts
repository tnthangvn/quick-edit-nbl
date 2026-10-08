import "server-only";
import type { RowPatch } from "@/ship/contracts/data";
import { RepositoryBase } from "@/ship/parents/RepositoryBase";
import type { AgentSessionRow } from "../../Models/AgentSession";

/** Số session trả về trong danh sách History. */
export const SESSION_LIST_LIMIT = 50;

export class AgentSessionRepository extends RepositoryBase<"agent_sessions"> {
  protected readonly model = "agent_sessions" as const;

  create(workspaceId: string): Promise<AgentSessionRow> {
    return this.insert({ workspace_id: workspaceId, title: null, cli_profile_id: null, cli_session_id: null, messages: { items: [] } });
  }

  findByIdOrNull(id: string): Promise<AgentSessionRow | undefined> {
    return this.findById(id);
  }

  listByWorkspace(workspaceId: string): Promise<AgentSessionRow[]> {
    return this.findMany({ workspace_id: workspaceId }, { orderBy: [["updated_at", "desc"]], limit: SESSION_LIST_LIMIT });
  }

  async patch(id: string, patch: RowPatch<"agent_sessions">): Promise<void> {
    await this.updateById(id, patch);
  }

  async remove(id: string): Promise<boolean> {
    return (await this.deleteById(id)) > 0;
  }
}
