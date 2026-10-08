import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { RemoveWorkspaceAction } from "../../../Actions/RemoveWorkspaceAction";
import type { removeWorkspaceContract } from "../Requests/RemoveWorkspaceRequest";

type C = typeof removeWorkspaceContract;

export class RemoveWorkspaceController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    await new RemoveWorkspaceAction().run(params);
    return { status: 204 };
  }
}
