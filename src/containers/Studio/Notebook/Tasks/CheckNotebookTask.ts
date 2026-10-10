import "server-only";
import { createDriveGateway, type DriveGatewayFactory } from "@/ship/adapters/google";
import { NotebookLmError } from "@/ship/adapters/notebooklm";
import { Task } from "@/ship/parents/Task";
import { notebookFailure } from "../Exceptions/mapNotebookFailure";
import { createNotebookClient, notebookCookieRefs, type NotebookClientFactory } from "../Models/notebookCredentials";
import { googleFailure } from "../../Storage/Exceptions/mapFailures";
import { googleSecretRefs } from "../../Storage/Models/googleSecret";

/**
 * Kiểm tra truy cập notebook và đọc danh sách source (nút Kiểm tra ở Wizard bước 3), gọi thẳng API nội bộ NotebookLM.
 * Notebook không tồn tại / không có quyền → ok = false. Chưa có cookie / cookie hết hạn → ném NOTEBOOK.CREDENTIALS_MISSING /
 * NOTEBOOK.AUTH_REQUIRED. Với DRIVE_SYNC còn yêu cầu đã đăng nhập Google (STORAGE.GOOGLE_*).
 */
export type CheckNotebookTaskInput = { notebookId: string; syncStrategy: "DRIVE_SYNC" | "RPC"; workspaceId: string };
export type CheckNotebookTaskOutput = { ok: boolean; sourceCount: number | null; title: string | null };

export class CheckNotebookTask extends Task<CheckNotebookTaskInput, CheckNotebookTaskOutput> {
  constructor(
    private readonly client: NotebookClientFactory = createNotebookClient,
    private readonly drive: DriveGatewayFactory = createDriveGateway,
  ) {
    super();
  }

  async run({ notebookId, syncStrategy, workspaceId }: CheckNotebookTaskInput): Promise<CheckNotebookTaskOutput> {
    if (syncStrategy === "DRIVE_SYNC") {
      try {
        await this.drive(googleSecretRefs(workspaceId));
      } catch (err) {
        throw googleFailure(err);
      }
    }
    try {
      const nb = await this.client(notebookCookieRefs(workspaceId)).getNotebook(notebookId);
      return { ok: true, sourceCount: nb.sourceCount, title: nb.title || null };
    } catch (err) {
      if (err instanceof NotebookLmError && err.kind === "NOT_FOUND") return { ok: false, sourceCount: null, title: null };
      throw notebookFailure(err);
    }
  }
}
