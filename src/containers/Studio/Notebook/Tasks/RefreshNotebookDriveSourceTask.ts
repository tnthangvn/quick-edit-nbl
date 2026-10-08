import "server-only";
import { NLM_DRIVE_DOC_TYPE, NlmClient } from "@/ship/adapters/nlm";
import { Task } from "@/ship/parents/Task";
import { nlmFailure } from "../Exceptions/mapNlmFailure";

export type RefreshNotebookDriveSourceInput = { notebookId: string; documentId: string; title: string };
export type RefreshNotebookDriveSourceOutput = { sourceId: string; added: boolean };

/**
 * Chiến lược DRIVE_SYNC (spec 6.2), sau khi Google Doc đã được ghi đè: source Drive cùng tên đã có → `nlm source sync`
 * kéo nội dung mới; chưa có → thêm Google Doc làm source; source cùng tên nhưng không phải Drive (vd tạo bằng RPC) → thay bằng source Drive.
 */
export class RefreshNotebookDriveSourceTask extends Task<RefreshNotebookDriveSourceInput, RefreshNotebookDriveSourceOutput> {
  constructor(private readonly nlm = new NlmClient()) {
    super();
  }

  async run({ notebookId, documentId, title }: RefreshNotebookDriveSourceInput): Promise<RefreshNotebookDriveSourceOutput> {
    try {
      const sameTitle = (await this.nlm.listSources(notebookId)).filter((s) => s.title === title);
      const drive = sameTitle.find((s) => s.type === NLM_DRIVE_DOC_TYPE);
      if (drive) {
        await this.nlm.syncDriveSources(notebookId, [drive.id]);
        await this.nlm.deleteSources(sameTitle.filter((s) => s.id !== drive.id).map((s) => s.id));
        return { sourceId: drive.id, added: false };
      }
      const sourceId = await this.nlm.addDriveSource(notebookId, documentId, title);
      await this.nlm.deleteSources(sameTitle.map((s) => s.id).filter((id) => id !== sourceId));
      return { sourceId, added: true };
    } catch (err) {
      throw nlmFailure(err);
    }
  }
}
