import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListAgentSessionsAction } from "../../../Actions/ListAgentSessionsAction";
import type { listAgentSessionsContract } from "../Requests/AgentSessionRequests";
import { AgentSessionSummaryTransformer } from "../Transformers/AgentSessionTransformer";

type C = typeof listAgentSessionsContract;

export class ListAgentSessionsController implements ContractController<C> {
  async handle({ query }: ContractInput<C>): Promise<ContractOutput<C>> {
    const items = await new ListAgentSessionsAction().run({ workspaceId: query.workspaceId });
    return { status: 200, body: { items: new AgentSessionSummaryTransformer().collection(items) } };
  }
}
