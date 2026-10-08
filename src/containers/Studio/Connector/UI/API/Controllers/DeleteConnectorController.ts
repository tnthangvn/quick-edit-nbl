import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { DeleteConnectorAction } from "../../../Actions/DeleteConnectorAction";
import type { deleteConnectorContract } from "../Requests/DeleteConnectorRequest";

type C = typeof deleteConnectorContract;

export class DeleteConnectorController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    await new DeleteConnectorAction().run({ connectorId: params.connectorId });
    return { status: 204 };
  }
}
