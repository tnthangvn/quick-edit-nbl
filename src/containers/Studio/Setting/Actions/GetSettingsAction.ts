import "server-only";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import { Action } from "@/ship/parents/Action";
import { GetAgentSettingsTask } from "../Tasks/GetAgentSettingsTask";

/** Cấu hình chung của app (Tab 1, 2). */
export class GetSettingsAction extends Action<void, AgentSettings> {
  constructor(private readonly getAgentSettings = new GetAgentSettingsTask()) {
    super();
  }

  run(): Promise<AgentSettings> {
    return this.getAgentSettings.run();
  }
}
