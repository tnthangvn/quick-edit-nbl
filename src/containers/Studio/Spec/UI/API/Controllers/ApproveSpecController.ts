import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { ApproveSpecAction } from "../../../Actions/ApproveSpecAction";
import type { approveSpecContract } from "../Requests/SpecRequests";
import { SpecDetailTransformer } from "../Transformers/SpecTransformer";

type C = typeof approveSpecContract;

export class ApproveSpecController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const { spec, runId } = await new ApproveSpecAction().run({ workspaceId: params.workspaceId, file: params.file, content: body.content });
    return { status: 200, body: { spec: new SpecDetailTransformer().transform(spec), runId } };
  }
}
