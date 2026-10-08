import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListPublishRunsAction } from "../../../Actions/ListPublishRunsAction";
import type { listPublishRunsContract } from "../Requests/PublishRequests";
import { PublishRunTransformer } from "../Transformers/PublishRunTransformer";

type C = typeof listPublishRunsContract;

export class ListPublishRunsController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    const runs = await new ListPublishRunsAction().run({ workspaceId: params.workspaceId });
    return { status: 200, body: { items: new PublishRunTransformer().collection(runs) } };
  }
}
