import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { GetAgentSessionAction } from "../../../Actions/GetAgentSessionAction";
import type { getAgentSessionContract } from "../Requests/AgentSessionRequests";
import { AgentSessionTransformer } from "../Transformers/AgentSessionTransformer";

type C = typeof getAgentSessionContract;

export class GetAgentSessionController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: new AgentSessionTransformer().transform(await new GetAgentSessionAction().run({ sessionId: params.sessionId })) };
  }
}
