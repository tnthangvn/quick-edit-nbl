import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { WriteWorkspaceSecretAction } from "../../../Actions/WriteWorkspaceSecretAction";
import type { setWorkspaceSecretContract } from "../Requests/SetWorkspaceSecretRequest";

type C = typeof setWorkspaceSecretContract;

export class SetWorkspaceSecretController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    await new WriteWorkspaceSecretAction().run({ ...params, value: body.value });
    return { status: 204 };
  }
}
