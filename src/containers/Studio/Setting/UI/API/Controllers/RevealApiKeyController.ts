import "server-only";
import type { ContractController, ContractOutput } from "@/ship/engine/defineRoute";
import { RevealApiKeyAction } from "../../../Actions/RevealApiKeyAction";
import type { revealApiKeyContract } from "../Requests/RevealApiKeyRequest";

type C = typeof revealApiKeyContract;

export class RevealApiKeyController implements ContractController<C> {
  async handle(): Promise<ContractOutput<C>> {
    return { status: 200, body: await new RevealApiKeyAction().run() };
  }
}
