import "server-only";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import { RepositoryBase } from "@/ship/parents/RepositoryBase";

/** Cấu hình cấp app (model app_settings), mỗi khoá một bản ghi. */
export class AppSettingRepository extends RepositoryBase<"app_settings"> {
  protected readonly model = "app_settings" as const;

  async findAgent(): Promise<AgentSettings | undefined> {
    return (await this.findOne({ key: "AGENT" }))?.value;
  }

  async saveAgent(value: AgentSettings): Promise<AgentSettings> {
    return (await this.upsert({ key: "AGENT", value }, ["key"])).value;
  }
}
