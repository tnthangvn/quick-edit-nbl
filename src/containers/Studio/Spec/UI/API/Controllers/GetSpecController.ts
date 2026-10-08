import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { GetSpecAction } from "../../../Actions/GetSpecAction";
import type { getSpecContract } from "../Requests/SpecRequests";
import { SpecDetailTransformer } from "../Transformers/SpecTransformer";

type C = typeof getSpecContract;

export class GetSpecController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    const spec = await new GetSpecAction().run({ workspaceId: params.workspaceId, file: params.file });
    return { status: 200, body: new SpecDetailTransformer().transform(spec) };
  }
}
