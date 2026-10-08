import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { GetStorageStatusAction } from "../../../Actions/GetStorageStatusAction";
import type { getStorageStatusContract } from "../Requests/StorageRequests";

type C = typeof getStorageStatusContract;

export class GetStorageStatusController implements ContractController<C> {
  async handle({ params }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new GetStorageStatusAction().run({ workspaceId: params.workspaceId }) };
  }
}
