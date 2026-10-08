import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { OpenWorkspaceAction } from "../../../Actions/OpenWorkspaceAction";
import type { openWorkspaceContract } from "../Requests/OpenWorkspaceRequest";
import { WorkspaceTransformer } from "../Transformers/WorkspaceTransformer";

type C = typeof openWorkspaceContract;

export class OpenWorkspaceController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    const { workspace, config } = await new OpenWorkspaceAction().run(params);
    return { status: 200, body: { workspace: new WorkspaceTransformer().transform(workspace), config } };
  }
}
