import "server-only";
import { Task } from "@/ship/parents/Task";
import { AgentSessionRepository } from "../Data/Repositories/AgentSessionRepository";

/** `cliSessionId: null` = quên phiên CLI (resume hỏng) → lượt sau bắt đầu phiên mới. */
export type SetCliSessionIdInput = { sessionId: string; profileId: string; cliSessionId: string | null };

/** Nhớ id phiên của CLI (theo profile) để lượt sau trong cùng session truyền cờ resume. */
export class SetCliSessionIdTask extends Task<SetCliSessionIdInput> {
  constructor(private readonly repo = new AgentSessionRepository()) {
    super();
  }

  async run({ sessionId, profileId, cliSessionId }: SetCliSessionIdInput): Promise<void> {
    await this.repo.patch(sessionId, { cli_profile_id: profileId, cli_session_id: cliSessionId });
  }
}
