import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListSpecsAction } from "../../../Actions/ListSpecsAction";
import type { listSpecsContract } from "../Requests/SpecRequests";
import { SpecFileTransformer } from "../Transformers/SpecTransformer";

type C = typeof listSpecsContract;

export class ListSpecsController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    const files = await new ListSpecsAction().run({ workspaceId: params.workspaceId });
    return { status: 200, body: { items: new SpecFileTransformer().collection(files) } };
  }
}
