import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListConnectorToolsAction } from "../../../Actions/ListConnectorToolsAction";
import type { listConnectorToolsContract } from "../Requests/ListConnectorToolsRequest";

type C = typeof listConnectorToolsContract;

export class ListConnectorToolsController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: { items: await new ListConnectorToolsAction().run({ connectorId: params.connectorId }) } };
  }
}
