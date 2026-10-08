import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { UpdateWorkspaceAction } from "../../../Actions/UpdateWorkspaceAction";
import type { updateWorkspaceContract } from "../Requests/UpdateWorkspaceRequest";
import { WorkspaceTransformer } from "../Transformers/WorkspaceTransformer";

type C = typeof updateWorkspaceContract;

export class UpdateWorkspaceController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const row = await new UpdateWorkspaceAction().run({ workspaceId: params.workspaceId, ...body });
    return { status: 200, body: new WorkspaceTransformer().transform(row) };
  }
}
