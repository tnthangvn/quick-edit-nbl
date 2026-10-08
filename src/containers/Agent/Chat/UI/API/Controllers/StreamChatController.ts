import "server-only";
import { createUIMessageStreamResponse } from "ai";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { StreamChatAction } from "../../../Actions/StreamChatAction";
import type { streamChatContract } from "../Requests/StreamChatRequest";

type C = typeof streamChatContract;

export class StreamChatController implements ContractController<C> {
  async handle({ body, request }: ContractInput<C>): Promise<ContractOutput<C>> {
    const stream = await new StreamChatAction().run({ ...body, signal: request.signal });
    return createUIMessageStreamResponse({ stream });
  }
}
