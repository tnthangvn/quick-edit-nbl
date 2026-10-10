import "server-only";
import { Task } from "@/ship/parents/Task";
import { notebookFailure } from "../Exceptions/mapNotebookFailure";
import { createNotebookClient, notebookCookieRefs, type NotebookClientFactory } from "../Models/notebookCredentials";

export type ReplaceNotebookTextSourceInput = { workspaceId: string; notebookId: string; title: string; content: string };
export type ReplaceNotebookTextSourceOutput = { sourceId: string; replaced: number };

/**
 * Chiến lược RPC (spec 6.2): lấy danh sách source → thêm source văn bản mới cùng tên → xoá mọi source cũ trùng tên.
 * Thêm trước rồi mới xoá bản cũ để notebook không bao giờ thiếu nội dung nếu bước thêm lỗi.
 */
export class ReplaceNotebookTextSourceTask extends Task<ReplaceNotebookTextSourceInput, ReplaceNotebookTextSourceOutput> {
  constructor(private readonly client: NotebookClientFactory = createNotebookClient) {
    super();
  }

  async run({ workspaceId, notebookId, title, content }: ReplaceNotebookTextSourceInput): Promise<ReplaceNotebookTextSourceOutput> {
    const nlm = this.client(notebookCookieRefs(workspaceId));
    try {
      const stale = (await nlm.listSources(notebookId)).filter((s) => s.title === title).map((s) => s.id);
      const sourceId = await nlm.addTextSource(notebookId, title, content);
      await nlm.deleteSources(stale.filter((id) => id !== sourceId));
      return { sourceId, replaced: stale.length };
    } catch (err) {
      throw notebookFailure(err);
    }
  }
}
