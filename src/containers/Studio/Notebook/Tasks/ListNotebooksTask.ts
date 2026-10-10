import "server-only";
import { NotebookLmClient, normalizeCookie } from "@/ship/adapters/notebooklm";
import { Task } from "@/ship/parents/Task";
import { notebookFailure } from "../Exceptions/mapNotebookFailure";
import { createNotebookClient, NOTEBOOK_COOKIE_REF, type NotebookClientFactory } from "../Models/notebookCredentials";

/**
 * Thử kết nối NotebookLM bằng cách liệt kê notebook. `cookie` có → thử chính cookie đó (trước khi lưu); không có → cookie dùng chung đã lưu.
 * Trả cookie đã chuẩn hoá để Action lưu.
 */
export class ListNotebooksTask extends Task<{ cookie?: string }, { notebookCount: number; cookie: string | null }> {
  constructor(
    private readonly client: NotebookClientFactory = createNotebookClient,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    super();
  }

  async run({ cookie }: { cookie?: string }): Promise<{ notebookCount: number; cookie: string | null }> {
    try {
      const normalized = cookie === undefined ? null : normalizeCookie(cookie);
      const nlm = normalized ? new NotebookLmClient(async () => normalized, this.fetchFn) : this.client([NOTEBOOK_COOKIE_REF]);
      return { notebookCount: (await nlm.listNotebooks()).length, cookie: normalized };
    } catch (err) {
      throw notebookFailure(err);
    }
  }
}
