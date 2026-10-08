import "server-only";
import { stat } from "node:fs/promises";
import { Task } from "@/ship/parents/Task";
import { WorkspaceRepository } from "../Data/Repositories/WorkspaceRepository";
import type { WorkspaceStatus } from "../Enums/WorkspaceStatus";
import type { WorkspaceRow } from "../Models/Workspace";

/** Dò lại thư mục của từng Workspace: không còn → FOLDER_MISSING (spec 3.0 "Workspace mất kết nối"). Chỉ ghi khi trạng thái đổi. */
export class RefreshWorkspaceStatusTask extends Task<{ rows: WorkspaceRow[] }, WorkspaceRow[]> {
  constructor(private readonly repo = new WorkspaceRepository()) {
    super();
  }

  run({ rows }: { rows: WorkspaceRow[] }): Promise<WorkspaceRow[]> {
    return Promise.all(
      rows.map(async (row) => {
        const isDir = await stat(row.path).then(
          (s) => s.isDirectory(),
          () => false,
        );
        const status: WorkspaceStatus = isDir ? "ACTIVE" : "FOLDER_MISSING";
        if (status === row.status) return row;
        return (await this.repo.patch(row.id, { status })) ?? { ...row, status };
      }),
    );
  }
}
