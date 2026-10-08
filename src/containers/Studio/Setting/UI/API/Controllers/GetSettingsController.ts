import "server-only";
import type { ContractController, ContractOutput } from "@/ship/engine/defineRoute";
import { GetSettingsAction } from "../../../Actions/GetSettingsAction";
import type { getSettingsContract } from "../Requests/GetSettingsRequest";
import { AgentSettingsTransformer } from "../Transformers/AgentSettingsTransformer";

type C = typeof getSettingsContract;

export class GetSettingsController implements ContractController<C> {
  async handle(): Promise<ContractOutput<C>> {
    return { status: 200, body: new AgentSettingsTransformer().transform(await new GetSettingsAction().run()) };
  }
}
