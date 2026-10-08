import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { WriteWorkspaceSecretAction } from "../../../Actions/WriteWorkspaceSecretAction";
import type { deleteWorkspaceSecretContract } from "../Requests/DeleteWorkspaceSecretRequest";

type C = typeof deleteWorkspaceSecretContract;

export class DeleteWorkspaceSecretController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    await new WriteWorkspaceSecretAction().run({ ...params, value: null });
    return { status: 204 };
  }
}
