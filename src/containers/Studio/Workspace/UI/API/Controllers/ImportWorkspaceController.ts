import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ImportWorkspaceAction } from "../../../Actions/ImportWorkspaceAction";
import type { importWorkspaceContract } from "../Requests/ImportWorkspaceRequest";
import { WorkspaceTransformer } from "../Transformers/WorkspaceTransformer";

type C = typeof importWorkspaceContract;

export class ImportWorkspaceController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 201, body: new WorkspaceTransformer().transform(await new ImportWorkspaceAction().run(body)) };
  }
}
