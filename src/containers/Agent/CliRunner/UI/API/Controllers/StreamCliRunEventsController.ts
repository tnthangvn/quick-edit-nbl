import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { sseResponse } from "@/ship/engine/sse";
import { WatchCliRunAction } from "../../../Actions/WatchCliRunAction";
import { CliRunEvent } from "../../../Events/CliRunEvent";
import type { streamCliRunEventsContract } from "../Requests/CliRunParamsRequest";

type C = typeof streamCliRunEventsContract;

export class StreamCliRunEventsController implements ContractController<C> {
  async handle({ params, request }: ContractInput<C>): Promise<ContractOutput<C>> {
    const run = await new WatchCliRunAction().run(params);
    return sseResponse(CliRunEvent, (send) => run.subscribe(send), request);
  }
}
