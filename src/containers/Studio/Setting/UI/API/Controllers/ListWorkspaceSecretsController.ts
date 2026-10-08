import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListWorkspaceSecretsAction } from "../../../Actions/ListWorkspaceSecretsAction";
import type { listWorkspaceSecretsContract } from "../Requests/ListWorkspaceSecretsRequest";

type C = typeof listWorkspaceSecretsContract;

export class ListWorkspaceSecretsController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: { items: await new ListWorkspaceSecretsAction().run(params) } };
  }
}
