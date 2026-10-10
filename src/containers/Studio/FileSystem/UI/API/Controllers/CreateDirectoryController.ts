import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CreateDirectoryAction } from "../../../Actions/CreateDirectoryAction";
import type { createDirectoryContract } from "../Requests/CreateDirectoryRequest";

type C = typeof createDirectoryContract;

export class CreateDirectoryController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 201, body: await new CreateDirectoryAction().run(body) };
  }
}
