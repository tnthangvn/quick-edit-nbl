import "server-only";
import type { ContractController, ContractOutput } from "@/ship/engine/defineRoute";
import { ExportSettingsAction } from "../../../Actions/ExportSettingsAction";
import type { exportSettingsContract } from "../Requests/ExportSettingsRequest";

type C = typeof exportSettingsContract;

export class ExportSettingsController implements ContractController<C> {
  async handle(): Promise<ContractOutput<C>> {
    return { status: 200, body: await new ExportSettingsAction().run() };
  }
}
