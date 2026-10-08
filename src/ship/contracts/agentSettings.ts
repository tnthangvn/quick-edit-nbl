import { z } from "zod";
import { AgentMode, CliAgentKind, CliOutputFormat, LlmProvider } from "./enums/agent";

/**
 * Cấu hình Agent dùng chung giữa Section Studio (container Setting lưu) và Section Agent (Chat, CliRunner đọc).
 * Secret không nằm ở đây: chỉ có `apiKeyRef` / `envFromSecrets`, giá trị thật lấy qua adapter secrets.
 */
export const CliProfile = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: CliAgentKind,
    command: z.string().min(1),
    /** "{prompt}" được thay bằng yêu cầu + danh sách spec trong context. */
    args: z.array(z.string()),
    outputFormat: CliOutputFormat,
    /** Biến môi trường; giá trị dạng "secret:<ref>" lấy từ secret store. */
    env: z.record(z.string(), z.string()).default({}),
  })
  .meta({ id: "CliProfile" });
export type CliProfile = z.infer<typeof CliProfile>;

export const AgentSettings = z
  .object({
    activeMode: AgentMode,
    api: z.object({
      provider: LlmProvider,
      model: z.string().min(1),
      baseUrl: z.string().nullable(),
      temperature: z.number().min(0).max(2),
      systemPrompt: z.string(),
      /** Tham chiếu secret của API key, null nếu chưa cấu hình. */
      apiKeyRef: z.string().nullable(),
    }),
    cli: z.object({
      activeProfileId: z.string(),
      streamStdout: z.boolean(),
      profiles: z.array(CliProfile),
    }),
  })
  .meta({ id: "AgentSettings" });
export type AgentSettings = z.infer<typeof AgentSettings>;
