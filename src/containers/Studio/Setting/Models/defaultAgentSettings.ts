import type { AgentSettings, CliProfile } from "@/ship/contracts/agentSettings";

/** Profile CLI mặc định (spec Tab 2). "{prompt}" = yêu cầu kèm danh sách spec trong context; cwd là bản sao
 * specsDir trong sandbox của agent session (CliRunner/PrepareSandboxTask), không phải thư mục thật. */
export const DEFAULT_CLI_PROFILES: CliProfile[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    kind: "CLAUDE_CODE",
    command: "claude",
    args: ["-p", "{prompt}", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--dangerously-skip-permissions"],
    outputFormat: "STREAM_JSON",
    env: {},
  },
  {
    id: "codex",
    name: "Codex CLI (ChatGPT)",
    kind: "CODEX",
    command: "codex",
    args: ["exec", "--sandbox", "workspace-write", "--json", "{prompt}"],
    outputFormat: "JSONL",
    env: {},
  },
  {
    id: "antigravity",
    name: "Antigravity CLI",
    kind: "ANTIGRAVITY",
    command: "agy",
    // Chế độ headless (-p) không hỏi quyền được: thiếu cờ này thì mọi tool cần quyền "command" bị tự từ chối.
    args: ["-p", "{prompt}", "--output-format", "stream-json", "--dangerously-skip-permissions"],
    outputFormat: "STREAM_JSON",
    env: {},
  },
  {
    id: "aider",
    name: "Aider",
    kind: "AIDER",
    command: "aider",
    args: ["--yes", "--no-auto-commits", "--message", "{prompt}"],
    outputFormat: "TEXT",
    env: {},
  },
  {
    id: "custom",
    name: "Custom Shell Script",
    kind: "CUSTOM",
    command: "./spec-agent.sh",
    args: ["--file", "{spec}", "--prompt", "{prompt}"],
    outputFormat: "TEXT",
    env: {},
  },
];

export const DEFAULT_SYSTEM_PROMPT =
  "Bạn là trợ lý viết đặc tả kỹ thuật (spec) dạng Markdown. Chỉ sửa đúng phần được yêu cầu, giữ nguyên cấu trúc tiêu đề và văn phong sẵn có. " +
  "Mọi thay đổi phải đi qua công cụ propose_spec_update để người dùng duyệt diff; không tự ghi file.";

/** Cấu hình Agent khi người dùng chưa lưu lần nào. */
export function defaultAgentSettings(): AgentSettings {
  return {
    activeMode: "API",
    api: {
      provider: "GOOGLE",
      model: "gemini-pro-latest",
      baseUrl: null,
      temperature: 0.2,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      apiKeyRef: null,
    },
    cli: {
      activeProfileId: "claude-code",
      streamStdout: true,
      permissionMode: "BYPASS",
      effort: "DEFAULT",
      profiles: structuredClone(DEFAULT_CLI_PROFILES),
    },
  };
}

/** Ref secret của API key theo provider, vd "llm:GOOGLE" (Section Agent đọc key qua apiKeyRef). */
export const llmApiKeyRef = (provider: AgentSettings["api"]["provider"]) => `llm:${provider}`;
