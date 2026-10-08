import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { UpdateConnectorAction } from "../../../Actions/UpdateConnectorAction";
import type { updateConnectorContract } from "../Requests/UpdateConnectorRequest";
import { ConnectorTransformer } from "../Transformers/ConnectorTransformer";

type C = typeof updateConnectorContract;

export class UpdateConnectorController implements ContractController<C> {
  async handle({ params, body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const row = await new UpdateConnectorAction().run({ connectorId: params.connectorId, ...body });
    return { status: 200, body: new ConnectorTransformer().transform(row) };
  }
}
