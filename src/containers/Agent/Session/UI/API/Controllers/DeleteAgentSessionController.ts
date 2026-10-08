import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { DeleteAgentSessionAction } from "../../../Actions/DeleteAgentSessionAction";
import type { deleteAgentSessionContract } from "../Requests/AgentSessionRequests";

type C = typeof deleteAgentSessionContract;

export class DeleteAgentSessionController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    await new DeleteAgentSessionAction().run({ sessionId: params.sessionId });
    return { status: 204 };
  }
}
