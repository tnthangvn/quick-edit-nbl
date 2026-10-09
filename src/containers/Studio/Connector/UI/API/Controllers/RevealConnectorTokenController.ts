import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { RevealConnectorTokenAction } from "../../../Actions/RevealConnectorTokenAction";
import type { revealConnectorTokenContract } from "../Requests/RevealConnectorTokenRequest";

type C = typeof revealConnectorTokenContract;

export class RevealConnectorTokenController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new RevealConnectorTokenAction().run(params) };
  }
}
