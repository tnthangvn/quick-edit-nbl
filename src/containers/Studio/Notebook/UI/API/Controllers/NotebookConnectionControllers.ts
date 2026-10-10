import "server-only";
import type { ContractController, ContractInput, ContractOutput } from "@/ship/engine/defineRoute";
import { CheckNotebookConnectionAction } from "../../../Actions/CheckNotebookConnectionAction";
import { DeleteNotebookConnectionAction } from "../../../Actions/DeleteNotebookConnectionAction";
import { GetNotebookConnectionAction } from "../../../Actions/GetNotebookConnectionAction";
import { SaveNotebookConnectionAction } from "../../../Actions/SaveNotebookConnectionAction";
import type {
  checkNotebookConnectionContract,
  deleteNotebookConnectionContract,
  getNotebookConnectionContract,
  saveNotebookConnectionContract,
} from "../Requests/NotebookConnectionRequests";

export class GetNotebookConnectionController implements ContractController<typeof getNotebookConnectionContract> {
  async handle(): Promise<ContractOutput<typeof getNotebookConnectionContract>> {
    return { status: 200, body: await new GetNotebookConnectionAction().run() };
  }
}

export class SaveNotebookConnectionController implements ContractController<typeof saveNotebookConnectionContract> {
  async handle({ body }: ContractInput<typeof saveNotebookConnectionContract>): Promise<ContractOutput<typeof saveNotebookConnectionContract>> {
    return { status: 200, body: await new SaveNotebookConnectionAction().run(body) };
  }
}

export class CheckNotebookConnectionController implements ContractController<typeof checkNotebookConnectionContract> {
  async handle(): Promise<ContractOutput<typeof checkNotebookConnectionContract>> {
    return { status: 200, body: await new CheckNotebookConnectionAction().run() };
  }
}

export class DeleteNotebookConnectionController implements ContractController<typeof deleteNotebookConnectionContract> {
  async handle(): Promise<ContractOutput<typeof deleteNotebookConnectionContract>> {
    await new DeleteNotebookConnectionAction().run();
    return { status: 204 };
  }
}
