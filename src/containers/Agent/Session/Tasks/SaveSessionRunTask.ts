import "server-only";
import type { NewRow } from "@/ship/contracts/data";
import { Task } from "@/ship/parents/Task";
import { AgentSessionRepository } from "../Data/Repositories/AgentSessionRepository";
import { AgentSessionRunRepository } from "../Data/Repositories/AgentSessionRunRepository";
import { sessionTitleOf } from "../Models/AgentSession";

/** LOG tối đa lưu cho một run (bộ nhớ cho phép 2000; transcript chỉ cần đủ đọc lại). */
const MAX_SAVED_LOGS = 300;

/** Lưu một run CLI đã kết thúc vào session; gán tiêu đề session từ prompt nếu chưa có, đẩy session lên đầu History. */
export class SaveSessionRunTask extends Task<NewRow<"agent_session_runs">> {
  constructor(
    private readonly sessions = new AgentSessionRepository(),
    private readonly runs = new AgentSessionRunRepository(),
  ) {
    super();
  }

  async run(row: NewRow<"agent_session_runs">): Promise<void> {
    const session = await this.sessions.findByIdOrNull(row.session_id);
    if (!session) return;
    let logs = 0;
    const items = row.events.items.filter((e) => e.type !== "LOG" || logs++ < MAX_SAVED_LOGS);
    await this.runs.create({ ...row, events: { items } });
    await this.sessions.patch(row.session_id, session.title ? {} : { title: sessionTitleOf(row.prompt) });
  }
}
