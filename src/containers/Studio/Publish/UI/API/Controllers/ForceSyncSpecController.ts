import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ForceSyncSpecAction } from "../../../Actions/ForceSyncSpecAction";
import type { forceSyncSpecContract } from "../Requests/PublishRequests";
import { PublishRunTransformer } from "../Transformers/PublishRunTransformer";

type C = typeof forceSyncSpecContract;

export class ForceSyncSpecController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const run = await new ForceSyncSpecAction().run({ workspaceId: params.workspaceId, file: params.file, target: body.target });
    return { status: 202, body: new PublishRunTransformer().transform(run) };
  }
}
