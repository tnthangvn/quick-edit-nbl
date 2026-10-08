import "server-only";
import type { ContractController, ContractOutput } from "@/ship/engine/defineRoute";
import { DetectCliAgentsAction } from "../../../Actions/DetectCliAgentsAction";
import type { detectCliAgentsContract } from "../Requests/DetectCliAgentsRequest";
import { CliAgentDetectionTransformer } from "../Transformers/CliAgentDetectionTransformer";

type C = typeof detectCliAgentsContract;

export class DetectCliAgentsController implements ContractController<C> {
  async handle(): Promise<ContractOutput<C>> {
    const items = await new DetectCliAgentsAction().run();
    return { status: 200, body: { items: new CliAgentDetectionTransformer().collection(items) } };
  }
}
