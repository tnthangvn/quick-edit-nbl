import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListConnectorBranchesAction } from "../../../Actions/ListConnectorBranchesAction";
import type { listConnectorBranchesContract } from "../Requests/ListConnectorBranchesRequest";

type C = typeof listConnectorBranchesContract;

export class ListConnectorBranchesController implements ContractController<C> {
  async handle({ params, query }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: { items: await new ListConnectorBranchesAction().run({ connectorId: params.connectorId, repo: query.repo }) } };
  }
}
