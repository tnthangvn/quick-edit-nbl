import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ReadGitConfigAction } from "../../../Actions/ReadGitConfigAction";
import type { readGitConfigContract } from "../Requests/ReadGitConfigRequest";

type C = typeof readGitConfigContract;

export class ReadGitConfigController implements ContractController<C> {
  async handle({ query }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 200, body: await new ReadGitConfigAction().run({ path: query.path }) };
  }
}
