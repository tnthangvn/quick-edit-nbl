import { z } from "zod";
import { AgentSettings } from "@/ship/contracts/agentSettings";
import { AppSettingKey } from "../Enums/AppSettingKey";

/** Cấu hình cấp app, mỗi khoá một bản ghi (model app_settings). Không chứa secret: API key nằm trong secret store. */
export const AppSettingRow = z.object({
  id: z.string(),
  key: AppSettingKey,
  value: AgentSettings,
  created_at: z.string(),
  updated_at: z.string(),
});
export type AppSettingRow = z.infer<typeof AppSettingRow>;

declare module "@/ship/contracts/data" {
  interface DataModels {
    app_settings: AppSettingRow;
  }
}
