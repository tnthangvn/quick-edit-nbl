import "server-only";
import type { ContractController, ContractOutput } from "@/ship/engine/defineRoute";
import { ListConnectorsAction } from "../../../Actions/ListConnectorsAction";
import type { listConnectorsContract } from "../Requests/ListConnectorsRequest";
import { ConnectorTransformer } from "../Transformers/ConnectorTransformer";

type C = typeof listConnectorsContract;

export class ListConnectorsController implements ContractController<C> {
  async handle(): Promise<ContractOutput<C>> {
    return { status: 200, body: { items: new ConnectorTransformer().collection(await new ListConnectorsAction().run()) } };
  }
}
