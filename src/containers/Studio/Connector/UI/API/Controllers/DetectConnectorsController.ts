import "server-only";
import type { ContractController, ContractOutput } from "@/ship/engine/defineRoute";
import { DetectConnectorsAction } from "../../../Actions/DetectConnectorsAction";
import type { detectConnectorsContract } from "../Requests/DetectConnectorsRequest";

type C = typeof detectConnectorsContract;

export class DetectConnectorsController implements ContractController<C> {
  async handle(): Promise<ContractOutput<C>> {
    return { status: 200, body: { items: await new DetectConnectorsAction().run() } };
  }
}
