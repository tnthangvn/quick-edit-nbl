import "server-only";
import { Action } from "@/ship/parents/Action";
import { WorkspaceConfigNotFoundException } from "../../Workspace/Exceptions/WorkspaceConfigNotFoundException";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import type { WorkspaceConfig } from "../Models/WorkspaceConfig";
import { ReadWorkspaceConfigTask } from "../Tasks/ReadWorkspaceConfigTask";

/** Cấu hình của Workspace đang mở (Tab 3, 4). */
export class GetWorkspaceConfigAction extends Action<{ workspaceId: string }, WorkspaceConfig> {
  constructor(
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<WorkspaceConfig> {
    const workspace = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: workspace.path });
    if (!config) throw new WorkspaceConfigNotFoundException({ path: workspace.path });
    return config;
  }
}
