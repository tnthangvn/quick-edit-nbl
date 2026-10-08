import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CreateAgentSessionAction } from "../../../Actions/CreateAgentSessionAction";
import type { createAgentSessionContract } from "../Requests/AgentSessionRequests";
import { AgentSessionTransformer } from "../Transformers/AgentSessionTransformer";

type C = typeof createAgentSessionContract;

export class CreateAgentSessionController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const session = await new CreateAgentSessionAction().run({ workspaceId: body.workspaceId });
    return { status: 201, body: new AgentSessionTransformer().transform({ session, runs: [] }) };
  }
}
