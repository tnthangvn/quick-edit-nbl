import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { UpdateSettingsAction } from "../../../Actions/UpdateSettingsAction";
import type { updateSettingsContract } from "../Requests/UpdateSettingsRequest";
import { AgentSettingsTransformer } from "../Transformers/AgentSettingsTransformer";

type C = typeof updateSettingsContract;

export class UpdateSettingsController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: new AgentSettingsTransformer().transform(await new UpdateSettingsAction().run(body)) };
  }
}
