import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { GetWorkspaceConfigAction } from "../../../Actions/GetWorkspaceConfigAction";
import type { getWorkspaceConfigContract } from "../Requests/GetWorkspaceConfigRequest";

type C = typeof getWorkspaceConfigContract;

export class GetWorkspaceConfigController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new GetWorkspaceConfigAction().run(params) };
  }
}
