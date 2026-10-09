import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { RevealWorkspaceSecretAction } from "../../../Actions/RevealWorkspaceSecretAction";
import type { revealWorkspaceSecretContract } from "../Requests/RevealWorkspaceSecretRequest";

type C = typeof revealWorkspaceSecretContract;

export class RevealWorkspaceSecretController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new RevealWorkspaceSecretAction().run(params) };
  }
}
