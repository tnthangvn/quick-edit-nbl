import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { PushWorkspaceAction } from "../../../Actions/PushWorkspaceAction";
import type { pushWorkspaceContract } from "../Requests/StorageRequests";

type C = typeof pushWorkspaceContract;

export class PushWorkspaceController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new PushWorkspaceAction().run({ workspaceId: params.workspaceId }) };
  }
}
