import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListConnectorReposAction } from "../../../Actions/ListConnectorReposAction";
import type { listConnectorReposContract } from "../Requests/ListConnectorReposRequest";

type C = typeof listConnectorReposContract;

export class ListConnectorReposController implements ContractController<C> {
  async handle({ params, query }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: { items: await new ListConnectorReposAction().run({ connectorId: params.connectorId, q: query.q }) } };
  }
}
