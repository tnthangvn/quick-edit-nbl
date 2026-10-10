import "server-only";
import { Action } from "@/ship/parents/Action";
import { WorkspaceDeleteNotConfirmedException } from "../Exceptions/WorkspaceDeleteNotConfirmedException";
import { DeleteWorkspaceFolderTask } from "../Tasks/DeleteWorkspaceFolderTask";
import { DeleteWorkspaceRecordTask } from "../Tasks/DeleteWorkspaceRecordTask";
import { GetWorkspaceTask } from "../Tasks/GetWorkspaceTask";
import { SearchWorkspacesTask } from "../Tasks/SearchWorkspacesTask";

export type RemoveWorkspaceInput = {
  workspaceId: string;
  /** true = xoá luôn thư mục trên máy (chỉ local). */
  deleteFiles?: boolean;
  /** Bắt buộc = "delete" khi deleteFiles. */
  confirm?: string;
};

/**
 * Gỡ Workspace khỏi danh sách (spec 3.0). Mặc định chỉ xoá bản ghi registry, không đụng file.
 * `deleteFiles` (người dùng gõ "delete" để xác nhận): xoá thư mục làm việc trên máy trước, xong mới gỡ bản ghi
 * (xoá thư mục lỗi thì Workspace vẫn còn trong danh sách). Không bao giờ đụng Git remote / Drive / NotebookLM.
 */
export class RemoveWorkspaceAction extends Action<RemoveWorkspaceInput, { filesDeleted: boolean }> {
  constructor(
    private readonly deleteRecord = new DeleteWorkspaceRecordTask(),
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly searchWorkspaces = new SearchWorkspacesTask(),
    private readonly deleteFolder = new DeleteWorkspaceFolderTask(),
  ) {
    super();
  }

  async run({ workspaceId, deleteFiles = false, confirm }: RemoveWorkspaceInput): Promise<{ filesDeleted: boolean }> {
    let filesDeleted = false;
    if (deleteFiles) {
      if (confirm !== "delete") throw new WorkspaceDeleteNotConfirmedException();
      const ws = await this.getWorkspace.run({ workspaceId });
      const others = (await this.searchWorkspaces.run({ sort: "NAME" })).filter((w) => w.id !== workspaceId).map((w) => w.path);
      filesDeleted = (await this.deleteFolder.run({ dir: ws.path, otherPaths: others })).deleted;
    }
    await this.deleteRecord.run({ workspaceId });
    return { filesDeleted };
  }
}
