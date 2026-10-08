import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ImportSettingsAction } from "../../../Actions/ImportSettingsAction";
import type { importSettingsContract } from "../Requests/ImportSettingsRequest";

type C = typeof importSettingsContract;

export class ImportSettingsController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new ImportSettingsAction().run(body) };
  }
}
