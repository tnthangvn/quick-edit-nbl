import "server-only";
import { NOTEBOOK_DRIVE_DOC_TYPE } from "@/ship/adapters/notebooklm";
import { Task } from "@/ship/parents/Task";
import { notebookFailure } from "../Exceptions/mapNotebookFailure";
import { createNotebookClient, notebookCookieRefs, type NotebookClientFactory } from "../Models/notebookCredentials";

export type RefreshNotebookDriveSourceInput = { workspaceId: string; notebookId: string; documentId: string; title: string };
export type RefreshNotebookDriveSourceOutput = { sourceId: string; added: boolean };

/**
 * Chiến lược DRIVE_SYNC (spec 6.2), sau khi Google Doc đã được ghi đè tại chỗ: source Drive trỏ tới Doc này đã có
 * → "Sync with Google Drive" (giữ nguyên source id); chưa có → thêm Doc làm source; source cùng tên không phải Drive
 * (vd tạo bằng RPC) → thay bằng source Drive. Gọi thẳng API nội bộ NotebookLM (adapter notebooklm), không qua CLI.
 */
export class RefreshNotebookDriveSourceTask extends Task<RefreshNotebookDriveSourceInput, RefreshNotebookDriveSourceOutput> {
  constructor(private readonly client: NotebookClientFactory = createNotebookClient) {
    super();
  }

  async run({ workspaceId, notebookId, documentId, title }: RefreshNotebookDriveSourceInput): Promise<RefreshNotebookDriveSourceOutput> {
    const nlm = this.client(notebookCookieRefs(workspaceId));
    try {
      const sources = await nlm.listSources(notebookId);
      const drive =
        sources.find((s) => s.driveDocId === documentId) ?? sources.find((s) => s.title === title && s.type === NOTEBOOK_DRIVE_DOC_TYPE);
      const stale = sources.filter((s) => s.title === title && s.id !== drive?.id).map((s) => s.id);
      if (drive) {
        await nlm.syncDriveSources(notebookId, [drive.id]);
        await nlm.deleteSources(stale);
        return { sourceId: drive.id, added: false };
      }
      const sourceId = await nlm.addDriveSource(notebookId, documentId, title);
      await nlm.deleteSources(stale.filter((id) => id !== sourceId));
      return { sourceId, added: true };
    } catch (err) {
      throw notebookFailure(err);
    }
  }
}
