import "server-only";
import { Action } from "@/ship/parents/Action";
import { ListNotebooksTask } from "../Tasks/ListNotebooksTask";
import { ReadNotebookConnectionTask } from "../Tasks/ReadNotebookConnectionTask";
import { WriteNotebookCookieTask } from "../Tasks/WriteNotebookCookieTask";

export type NotebookConnection = { isSet: boolean; masked: string | null; notebookCount: number };

/** Dán cookie NotebookLM: thử kết nối bằng cookie mới trước, chỉ lưu (mã hoá) khi NotebookLM nhận. */
export class SaveNotebookConnectionAction extends Action<{ cookie: string }, NotebookConnection> {
  constructor(
    private readonly listNotebooks = new ListNotebooksTask(),
    private readonly write = new WriteNotebookCookieTask(),
    private readonly read = new ReadNotebookConnectionTask(),
  ) {
    super();
  }

  async run({ cookie }: { cookie: string }): Promise<NotebookConnection> {
    const checked = await this.listNotebooks.run({ cookie });
    await this.write.run({ cookie: checked.cookie });
    return { ...(await this.read.run()), notebookCount: checked.notebookCount };
  }
}
