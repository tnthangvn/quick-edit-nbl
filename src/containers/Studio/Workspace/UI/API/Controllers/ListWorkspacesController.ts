import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ListWorkspacesAction } from "../../../Actions/ListWorkspacesAction";
import type { listWorkspacesContract } from "../Requests/ListWorkspacesRequest";
import { WorkspaceTransformer } from "../Transformers/WorkspaceTransformer";

type C = typeof listWorkspacesContract;

export class ListWorkspacesController implements ContractController<C> {
  async handle({ query }: ContractInput<C>): Promise<ContractOutput<C>> {
    const rows = await new ListWorkspacesAction().run(query);
    return { status: 200, body: { items: new WorkspaceTransformer().collection(rows) } };
  }
}
