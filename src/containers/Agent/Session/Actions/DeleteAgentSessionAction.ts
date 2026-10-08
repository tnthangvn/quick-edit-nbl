import "server-only";
import { Action } from "@/ship/parents/Action";
import { sessionSandboxRoot } from "../../CliRunner/Models/Sandbox";
import { RemoveSandboxTask } from "../../CliRunner/Tasks/RemoveSandboxTask";
import { DeleteAgentSessionTask } from "../Tasks/DeleteAgentSessionTask";
import { GetAgentSessionTask } from "../Tasks/GetAgentSessionTask";

/** Xoá session: dữ liệu đã lưu + sandbox cố định của session (bản sao specs của CLI). */
export class DeleteAgentSessionAction extends Action<{ sessionId: string }> {
  constructor(
    private readonly getSession = new GetAgentSessionTask(),
    private readonly deleteSession = new DeleteAgentSessionTask(),
    private readonly removeSandbox = new RemoveSandboxTask(),
  ) {
    super();
  }

  async run({ sessionId }: { sessionId: string }): Promise<void> {
    await this.getSession.run({ sessionId });
    await this.deleteSession.run({ sessionId });
    await this.removeSandbox.run({ root: sessionSandboxRoot(sessionId) });
  }
}
