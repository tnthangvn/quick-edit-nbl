import "server-only";
import { AgentSettings } from "@/ship/contracts/agentSettings";
import { Task } from "@/ship/parents/Task";
import { AppSettingRepository } from "../Data/Repositories/AppSettingRepository";

export class SaveAgentSettingsTask extends Task<AgentSettings, AgentSettings> {
  constructor(private readonly repo = new AppSettingRepository()) {
    super();
  }

  run(settings: AgentSettings): Promise<AgentSettings> {
    return this.repo.saveAgent(AgentSettings.parse(settings));
  }
}
