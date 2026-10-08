import "server-only";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import { Task } from "@/ship/parents/Task";
import { AppSettingRepository } from "../Data/Repositories/AppSettingRepository";
import { defaultAgentSettings } from "../Models/defaultAgentSettings";

/** Cấu hình Agent chung (Tab 1, 2); chưa lưu lần nào thì trả mặc định. */
export class GetAgentSettingsTask extends Task<void, AgentSettings> {
  constructor(private readonly repo = new AppSettingRepository()) {
    super();
  }

  async run(): Promise<AgentSettings> {
    return (await this.repo.findAgent()) ?? defaultAgentSettings();
  }
}
