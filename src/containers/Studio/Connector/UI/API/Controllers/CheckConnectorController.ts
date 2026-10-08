import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CheckConnectorAction } from "../../../Actions/CheckConnectorAction";
import type { checkConnectorContract } from "../Requests/CheckConnectorRequest";

type C = typeof checkConnectorContract;

export class CheckConnectorController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new CheckConnectorAction().run({ connectorId: params.connectorId }) };
  }
}
