import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { DisconnectGoogleOAuthAction } from "../../../Actions/DisconnectGoogleOAuthAction";
import type { disconnectGoogleOAuthContract } from "../Requests/StorageRequests";

type C = typeof disconnectGoogleOAuthContract;

export class DisconnectGoogleOAuthController implements ContractController<C> {
  async handle({ query }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new DisconnectGoogleOAuthAction().run({ workspaceId: query.workspaceId }) };
  }
}
