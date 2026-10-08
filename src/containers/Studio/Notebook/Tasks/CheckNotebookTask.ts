import "server-only";
import { createDriveGateway, type DriveGatewayFactory } from "@/ship/adapters/google";
import { NlmClient, NlmError } from "@/ship/adapters/nlm";
import { Task } from "@/ship/parents/Task";
import { nlmFailure } from "../Exceptions/mapNlmFailure";
import { googleFailure } from "../../Storage/Exceptions/mapFailures";
import { googleSecretRefs } from "../../Storage/Models/googleSecret";

/**
 * Kiểm tra truy cập notebook và đọc danh sách source (nút Kiểm tra ở Wizard bước 3), qua `nlm notebook get`.
 * Notebook không tồn tại / không có quyền → ok = false. CLI thiếu, phiên hết hạn → ném NOTEBOOK.CLI_NOT_FOUND /
 * NOTEBOOK.AUTH_REQUIRED. Với DRIVE_SYNC còn yêu cầu đã đăng nhập Google (STORAGE.GOOGLE_*).
 */
export type CheckNotebookTaskInput = { notebookId: string; syncStrategy: "DRIVE_SYNC" | "RPC"; workspaceId: string };
export type CheckNotebookTaskOutput = { ok: boolean; sourceCount: number | null; title: string | null };

export class CheckNotebookTask extends Task<CheckNotebookTaskInput, CheckNotebookTaskOutput> {
  constructor(
    private readonly nlm = new NlmClient(),
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
      const nb = await this.nlm.getNotebook(notebookId);
      return { ok: true, sourceCount: nb.sourceCount, title: nb.title || null };
    } catch (err) {
      if (err instanceof NlmError && err.kind === "NOT_FOUND") return { ok: false, sourceCount: null, title: null };
      throw nlmFailure(err);
    }
  }
}
