import "server-only";
import { Action } from "@/ship/parents/Action";
import { ListNotebooksTask } from "../Tasks/ListNotebooksTask";

/** Nút Kiểm tra: cookie dùng chung còn dùng được không (đếm notebook). */
export class CheckNotebookConnectionAction extends Action<void, { notebookCount: number }> {
  constructor(private readonly listNotebooks = new ListNotebooksTask()) {
    super();
  }

  async run(): Promise<{ notebookCount: number }> {
    return { notebookCount: (await this.listNotebooks.run({})).notebookCount };
  }
}
