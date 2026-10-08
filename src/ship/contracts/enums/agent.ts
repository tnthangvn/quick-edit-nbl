import { z } from "zod";

/** Chế độ Agent trên Quick Setting Toolbar (spec 3.4). */
export const AgentMode = z.enum(["API", "CLI"]).meta({ id: "AgentMode" });
export type AgentMode = z.infer<typeof AgentMode>;

/** Provider cho Direct API (spec Tab 1). */
export const LlmProvider = z.enum(["GOOGLE", "ANTHROPIC", "OPENAI", "DEEPSEEK", "OLLAMA"]).meta({ id: "LlmProvider" });
export type LlmProvider = z.infer<typeof LlmProvider>;

/** Loại CLI agent (spec Tab 2). */
export const CliAgentKind = z.enum(["CLAUDE_CODE", "CODEX", "ANTIGRAVITY", "AIDER", "CUSTOM"]).meta({ id: "CliAgentKind" });
export type CliAgentKind = z.infer<typeof CliAgentKind>;

/** Định dạng stdout của CLI để parser đọc. */
export const CliOutputFormat = z.enum(["STREAM_JSON", "JSONL", "TEXT"]).meta({ id: "CliOutputFormat" });
export type CliOutputFormat = z.infer<typeof CliOutputFormat>;
