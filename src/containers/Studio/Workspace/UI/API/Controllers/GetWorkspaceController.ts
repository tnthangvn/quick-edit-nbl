import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { GetWorkspaceAction } from "../../../Actions/GetWorkspaceAction";
import type { getWorkspaceContract } from "../Requests/GetWorkspaceRequest";
import { WorkspaceTransformer } from "../Transformers/WorkspaceTransformer";

type C = typeof getWorkspaceContract;

export class GetWorkspaceController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: new WorkspaceTransformer().transform(await new GetWorkspaceAction().run(params)) };
  }
}
