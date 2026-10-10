import "server-only";
import { Action } from "@/ship/parents/Action";
import { WriteNotebookCookieTask } from "../Tasks/WriteNotebookCookieTask";

/** Ngắt kết nối NotebookLM: xoá cookie dùng chung (cookie riêng của Workspace giữ nguyên). */
export class DeleteNotebookConnectionAction extends Action<void, void> {
  constructor(private readonly write = new WriteNotebookCookieTask()) {
    super();
  }

  run(): Promise<void> {
    return this.write.run({ cookie: null });
  }
}
