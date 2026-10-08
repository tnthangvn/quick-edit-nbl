import "server-only";
import { NlmClient } from "@/ship/adapters/nlm";
import { Task } from "@/ship/parents/Task";
import { nlmFailure } from "../Exceptions/mapNlmFailure";

export type ReplaceNotebookTextSourceInput = { notebookId: string; title: string; content: string };
export type ReplaceNotebookTextSourceOutput = { sourceId: string; replaced: number };

/**
 * Chiến lược RPC (spec 6.2): lấy danh sách source → xoá mọi source trùng tên → thêm source văn bản mới cùng tên.
 * Thêm trước rồi mới xoá bản cũ để notebook không bao giờ thiếu nội dung nếu bước thêm lỗi.
 */
export class ReplaceNotebookTextSourceTask extends Task<ReplaceNotebookTextSourceInput, ReplaceNotebookTextSourceOutput> {
  constructor(private readonly nlm = new NlmClient()) {
    super();
  }

  async run({ notebookId, title, content }: ReplaceNotebookTextSourceInput): Promise<ReplaceNotebookTextSourceOutput> {
    try {
      const stale = (await this.nlm.listSources(notebookId)).filter((s) => s.title === title).map((s) => s.id);
      const sourceId = await this.nlm.addTextSource(notebookId, title, content);
      await this.nlm.deleteSources(stale.filter((id) => id !== sourceId));
      return { sourceId, replaced: stale.length };
    } catch (err) {
      throw nlmFailure(err);
    }
  }
}
