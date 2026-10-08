import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CreateConnectorAction } from "../../../Actions/CreateConnectorAction";
import type { createConnectorContract } from "../Requests/CreateConnectorRequest";
import { ConnectorTransformer } from "../Transformers/ConnectorTransformer";

type C = typeof createConnectorContract;

export class CreateConnectorController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    return { status: 201, body: new ConnectorTransformer().transform(await new CreateConnectorAction().run(body)) };
  }
}
