import "server-only";
import type { WorkspaceRef } from "@/ship/contracts/studioAccess";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";

/** Thông tin Workspace mà Section Agent cần để làm việc với spec (qua SpecAccess). */
export class GetSpecsWorkspaceAction extends Action<{ workspaceId: string }, WorkspaceRef> {
  constructor(private readonly getWorkspace = new GetWorkspaceTask()) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<WorkspaceRef> {
    const ws = await this.getWorkspace.run({ workspaceId });
    return { id: ws.id, name: ws.name, path: ws.path, specsDir: ws.specs_dir };
  }
}
