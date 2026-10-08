import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { PullWorkspaceAction } from "../../../Actions/PullWorkspaceAction";
import type { pullWorkspaceContract } from "../Requests/StorageRequests";

type C = typeof pullWorkspaceContract;

export class PullWorkspaceController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new PullWorkspaceAction().run({ workspaceId: params.workspaceId }) };
  }
}
