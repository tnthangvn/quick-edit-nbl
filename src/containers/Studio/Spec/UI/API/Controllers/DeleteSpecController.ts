import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { DeleteSpecAction } from "../../../Actions/DeleteSpecAction";
import type { deleteSpecContract } from "../Requests/SpecRequests";

type C = typeof deleteSpecContract;

export class DeleteSpecController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    await new DeleteSpecAction().run({ workspaceId: params.workspaceId, file: params.file });
    return { status: 204 };
  }
}
