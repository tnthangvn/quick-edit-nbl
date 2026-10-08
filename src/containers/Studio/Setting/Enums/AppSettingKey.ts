import { z } from "zod";

/** Khoá của bản ghi cấu hình cấp app (model app_settings). AGENT: cấu hình Agent (Tab 1, 2). */
export const AppSettingKey = z.enum(["AGENT"]).meta({ id: "AppSettingKey" });
export type AppSettingKey = z.infer<typeof AppSettingKey>;
