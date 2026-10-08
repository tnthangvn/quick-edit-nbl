import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { RenameSpecAction } from "../../../Actions/RenameSpecAction";
import type { renameSpecContract } from "../Requests/SpecRequests";
import { SpecFileTransformer } from "../Transformers/SpecTransformer";

type C = typeof renameSpecContract;

export class RenameSpecController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const spec = await new RenameSpecAction().run({ workspaceId: params.workspaceId, file: params.file, newFile: body.newFile });
    return { status: 200, body: new SpecFileTransformer().transform(spec) };
  }
}
