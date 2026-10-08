import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CompleteGoogleOAuthAction } from "../../../Actions/CompleteGoogleOAuthAction";
import type { completeGoogleOAuthContract } from "../Requests/StorageRequests";

type C = typeof completeGoogleOAuthContract;

export class CompleteGoogleOAuthController implements ContractController<C> {
  async handle({ query }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new CompleteGoogleOAuthAction().run(query) };
  }
}
