import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CheckWorkspaceAction } from "../../../Actions/CheckWorkspaceAction";
import type { checkWorkspaceContract } from "../Requests/CheckWorkspaceRequest";

type C = typeof checkWorkspaceContract;

export class CheckWorkspaceController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: { items: await new CheckWorkspaceAction().run(params) } };
  }
}
