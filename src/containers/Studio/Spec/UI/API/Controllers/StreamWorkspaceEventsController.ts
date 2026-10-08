import "server-only";
import { WorkspaceEvent } from "@/ship/contracts/events";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { sseResponse, type SseSend } from "@/ship/engine/sse";
import { StreamWorkspaceEventsAction } from "../../../Actions/StreamWorkspaceEventsAction";
import type { streamWorkspaceEventsContract } from "../Requests/SpecRequests";

type C = typeof streamWorkspaceEventsContract;

export class StreamWorkspaceEventsController implements ContractController<C> {
  async handle({ params, request }: ContractInput<C>): Promise<ContractOutput<C>> {
    // Đăng ký trước khi mở stream để Workspace không tồn tại trả 404 thay vì stream rỗng; event đến sớm được giữ lại.
    let send: SseSend<WorkspaceEvent> | undefined;
    const early: WorkspaceEvent[] = [];
    const stop = await new StreamWorkspaceEventsAction().run({
      workspaceId: params.workspaceId,
      onEvent: (event) => (send ? send(event) : early.push(event)),
    });
    return sseResponse(
      WorkspaceEvent,
      (s) => {
        send = s;
        early.splice(0).forEach(s);
        return stop;
      },
      request,
    );
  }
}
