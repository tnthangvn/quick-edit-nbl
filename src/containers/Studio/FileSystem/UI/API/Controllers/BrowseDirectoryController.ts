import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { BrowseDirectoryAction } from "../../../Actions/BrowseDirectoryAction";
import type { browseDirectoryContract } from "../Requests/BrowseDirectoryRequest";

type C = typeof browseDirectoryContract;

export class BrowseDirectoryController implements ContractController<C> {
  async handle({ query }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new BrowseDirectoryAction().run({ path: query.path }) };
  }
}
