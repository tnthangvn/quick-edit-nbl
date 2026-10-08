import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CheckNotebookAction } from "../../../Actions/CheckNotebookAction";
import type { checkNotebookContract } from "../Requests/CheckNotebookRequest";

type C = typeof checkNotebookContract;

export class CheckNotebookController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new CheckNotebookAction().run({ workspaceId: params.workspaceId, ...body }) };
  }
}
