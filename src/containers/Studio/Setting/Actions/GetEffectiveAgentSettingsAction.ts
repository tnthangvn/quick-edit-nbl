import "server-only";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import { Action } from "@/ship/parents/Action";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { mergeAgentSettings } from "../Models/mergeAgentSettings";
import { CheckSecretsPresenceTask } from "../Tasks/CheckSecretsPresenceTask";
import { GetAgentSettingsTask } from "../Tasks/GetAgentSettingsTask";
import { ReadWorkspaceConfigTask } from "../Tasks/ReadWorkspaceConfigTask";

/** Cấu hình Agent hiệu lực cho một Workspace (chung + ghi đè trong config.json), dùng cho Section Agent qua provider. */
export class GetEffectiveAgentSettingsAction extends Action<{ workspaceId?: string }, AgentSettings> {
  constructor(
    private readonly getAgentSettings = new GetAgentSettingsTask(),
    private readonly getWorkspace = new GetWorkspaceTask(),
    private readonly readConfig = new ReadWorkspaceConfigTask(),
    private readonly checkSecrets = new CheckSecretsPresenceTask(),
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId?: string }): Promise<AgentSettings> {
    const base = await this.getAgentSettings.run();
    if (!workspaceId) return base;
    const workspace = await this.getWorkspace.run({ workspaceId });
    const config = await this.readConfig.run({ workspacePath: workspace.path }).catch(() => undefined);
    const merged = mergeAgentSettings(base, config?.agent);
    const ref = merged.api.apiKeyRef;
    if (ref && ref !== base.api.apiKeyRef && !(await this.checkSecrets.run({ refs: [ref] }))[ref]) merged.api.apiKeyRef = null;
    return merged;
  }
}
