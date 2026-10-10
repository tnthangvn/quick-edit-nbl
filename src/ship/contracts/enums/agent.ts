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

/**
 * Mức quyền của CLI agent khi chạy headless (Quick Setting Toolbar). DEFAULT = giữ nguyên cờ trong args của profile;
 * các mức khác thay cờ quyền theo loại CLI (Claude Code, Codex, Antigravity). Aider / Custom luôn theo profile.
 */
export const CliPermissionMode = z.enum(["DEFAULT", "PLAN", "ACCEPT_EDITS", "BYPASS"]).meta({ id: "CliPermissionMode" });
export type CliPermissionMode = z.infer<typeof CliPermissionMode>;

/**
 * Mức effort / reasoning của CLI agent (Quick Setting Toolbar). DEFAULT = không truyền cờ, CLI tự chọn.
 * Claude Code / Antigravity: `--effort <low|medium|high|xhigh|max>`; Codex: `-c model_reasoning_effort=…` (tối đa high).
 */
export const CliEffort = z.enum(["DEFAULT", "LOW", "MEDIUM", "HIGH", "XHIGH", "MAX"]).meta({ id: "CliEffort" });
export type CliEffort = z.infer<typeof CliEffort>;
