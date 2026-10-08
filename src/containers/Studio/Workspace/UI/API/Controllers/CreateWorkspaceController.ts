import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CreateWorkspaceAction } from "../../../Actions/CreateWorkspaceAction";
import type { createWorkspaceContract } from "../Requests/CreateWorkspaceRequest";
import { WorkspaceTransformer } from "../Transformers/WorkspaceTransformer";

type C = typeof createWorkspaceContract;

export class CreateWorkspaceController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 201, body: new WorkspaceTransformer().transform(await new CreateWorkspaceAction().run(body)) };
  }
}
