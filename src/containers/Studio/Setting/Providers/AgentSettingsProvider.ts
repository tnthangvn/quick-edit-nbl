import "server-only";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import type { AgentSettingsAccess } from "@/ship/contracts/studioAccess";
import { GetEffectiveAgentSettingsAction } from "../Actions/GetEffectiveAgentSettingsAction";

/**
 * Cổng đọc cấu hình Agent cho Section Agent (nối ở src/containers/providers.ts).
 * Có workspaceId → áp phần ghi đè trong config.json của Workspace; Workspace không tồn tại → WORKSPACE.NOT_FOUND.
 */
export class AgentSettingsProvider implements AgentSettingsAccess {
  get(workspaceId?: string): Promise<AgentSettings> {
    return new GetEffectiveAgentSettingsAction().run({ workspaceId });
  }
}
