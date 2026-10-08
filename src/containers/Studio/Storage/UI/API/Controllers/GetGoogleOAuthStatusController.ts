import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { GetGoogleOAuthStatusAction } from "../../../Actions/GetGoogleOAuthStatusAction";
import type { getGoogleOAuthStatusContract } from "../Requests/StorageRequests";

type C = typeof getGoogleOAuthStatusContract;

export class GetGoogleOAuthStatusController implements ContractController<C> {
  async handle({ query }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new GetGoogleOAuthStatusAction().run({ workspaceId: query.workspaceId }) };
  }
}
