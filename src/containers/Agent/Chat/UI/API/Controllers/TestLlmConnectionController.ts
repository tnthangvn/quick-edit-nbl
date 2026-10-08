import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { TestLlmConnectionAction } from "../../../Actions/TestLlmConnectionAction";
import type { testLlmConnectionContract } from "../Requests/TestLlmConnectionRequest";
import { LlmConnectionTestTransformer } from "../Transformers/LlmConnectionTestTransformer";

type C = typeof testLlmConnectionContract;

export class TestLlmConnectionController implements ContractController<C> {
  async handle({ body }: ContractInput<C>): Promise<ContractOutput<C>> {
    const result = await new TestLlmConnectionAction().run(body);
    return { status: 200, body: new LlmConnectionTestTransformer().transform(result) };
  }
}
