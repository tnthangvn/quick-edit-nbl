import { z } from "zod";
import { AgentSettings, CliProfile } from "@/ship/contracts/agentSettings";
import { defineContract } from "@/ship/engine/defineRoute";
import { AgentSettingsView } from "../Transformers/AgentSettingsTransformer";

export const UpdateSettingsBody = z
  .object({
    activeMode: AgentSettings.shape.activeMode,
    api: AgentSettings.shape.api.omit({ apiKeyRef: true }).extend({
      baseUrl: z.url({ protocol: /^https?$/ }).nullable(),
      apiKey: z
        .string()
        .trim()
        .min(1)
        .max(4096)
        .nullable()
        .optional()
        .meta({ description: "Chỉ ghi: chuỗi = lưu key cho provider đang chọn, null = xoá, bỏ trống = giữ nguyên" }),
    }),
    cli: AgentSettings.shape.cli.extend({ profiles: z.array(CliProfile).min(1).max(50) }),
  })
  .superRefine((v, ctx) => {
    const ids = v.cli.profiles.map((p) => p.id);
    ids.forEach((id, i) => {
      if (ids.indexOf(id) !== i) ctx.addIssue({ code: "custom", path: ["cli", "profiles", i, "id"], message: "SETTING.CLI_PROFILE_DUPLICATE" });
    });
    if (!ids.includes(v.cli.activeProfileId)) {
      ctx.addIssue({ code: "custom", path: ["cli", "activeProfileId"], message: "SETTING.CLI_PROFILE_NOT_FOUND" });
    }
  })
  .meta({ id: "UpdateSettingsInput" });

export const updateSettingsContract = defineContract({
  request: { body: UpdateSettingsBody },
  responses: { 200: AgentSettingsView },
});
