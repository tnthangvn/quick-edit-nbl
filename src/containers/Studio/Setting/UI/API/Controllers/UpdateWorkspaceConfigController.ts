import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { UpdateWorkspaceConfigAction } from "../../../Actions/UpdateWorkspaceConfigAction";
import type { updateWorkspaceConfigContract } from "../Requests/UpdateWorkspaceConfigRequest";

type C = typeof updateWorkspaceConfigContract;

export class UpdateWorkspaceConfigController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new UpdateWorkspaceConfigAction().run({ workspaceId: params.workspaceId, config: body }) };
  }
}
