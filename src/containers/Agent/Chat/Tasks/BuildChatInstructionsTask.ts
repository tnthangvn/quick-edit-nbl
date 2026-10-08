import "server-only";
import { Task } from "@/ship/parents/Task";
import type { ContextSpec } from "../Models/ContextSpec";

export type BuildChatInstructionsInput = {
  /** System Prompt Preset trong Settings (Tab 1). */
  systemPrompt: string;
  workspaceName: string;
  specs: ContextSpec[];
};

/** Quy tắc cố định cho Agent: chỉ đề xuất, không tự ghi (spec 5.2, 6.1). Viết tiếng Anh vì dành cho model. */
const RULES = [
  "You help the user edit Markdown specification files. Files are identified by their path relative to the workspace specs folder.",
  "To change or create a file, call `propose_spec_update` with the COMPLETE new content of that file (never a fragment or a diff).",
  "A proposal does not write anything: the user reviews a diff and chooses Approve or Reject. Never claim that a file was saved.",
  "Use `list_specs` and `read_spec` to inspect files that are not included below.",
  "Saving, deleting, syncing to NotebookLM and publishing (git push / pull request) are done by the user in the UI. If asked to do these, explain which action the user should take instead.",
  "Reply in the same language the user writes in.",
];

/** Ghép system prompt: preset của người dùng + quy tắc Spec Studio + nội dung các spec trong context. */
export class BuildChatInstructionsTask extends Task<BuildChatInstructionsInput, string> {
  async run({ systemPrompt, workspaceName, specs }: BuildChatInstructionsInput): Promise<string> {
    const parts = [systemPrompt.trim(), `## Spec Studio\nWorkspace: ${workspaceName}\n${RULES.map((r) => `- ${r}`).join("\n")}`];
    if (specs.length) {
      const files = specs.map((s) => `<spec file=${JSON.stringify(s.file)}>\n${s.content}\n</spec>`).join("\n\n");
      parts.push(`## Context specs selected by the user\n${files}`);
    }
    return parts.filter(Boolean).join("\n\n");
  }
}
