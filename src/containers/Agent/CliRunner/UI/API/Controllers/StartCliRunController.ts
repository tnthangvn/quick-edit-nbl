import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { StartCliRunAction } from "../../../Actions/StartCliRunAction";
import type { startCliRunContract } from "../Requests/StartCliRunRequest";
import { CliRunTransformer } from "../Transformers/CliRunTransformer";

type C = typeof startCliRunContract;

export class StartCliRunController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const result = await new StartCliRunAction().run(body);
    return { status: 202, body: new CliRunTransformer().transform(result) };
  }
}
