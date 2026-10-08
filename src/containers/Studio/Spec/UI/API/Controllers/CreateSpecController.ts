import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CreateSpecAction } from "../../../Actions/CreateSpecAction";
import type { createSpecContract } from "../Requests/SpecRequests";
import { SpecDetailTransformer } from "../Transformers/SpecTransformer";

type C = typeof createSpecContract;

export class CreateSpecController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const spec = await new CreateSpecAction().run({ workspaceId: params.workspaceId, file: body.file, content: body.content });
    return { status: 201, body: new SpecDetailTransformer().transform(spec) };
  }
}
