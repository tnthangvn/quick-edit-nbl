import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { StopCliRunAction } from "../../../Actions/StopCliRunAction";
import type { stopCliRunContract } from "../Requests/CliRunParamsRequest";

type C = typeof stopCliRunContract;

export class StopCliRunController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    await new StopCliRunAction().run(params);
    return { status: 204 };
  }
}
