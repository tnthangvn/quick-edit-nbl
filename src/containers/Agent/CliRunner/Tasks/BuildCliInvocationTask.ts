import "server-only";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/ship/adapters/logger";
import { which } from "@/ship/adapters/process";
import { resolveSecretValue } from "@/ship/adapters/secrets";
import type { CliProfile } from "@/ship/contracts/agentSettings";
import { Task } from "@/ship/parents/Task";
import { CliNotInstalledException, CliSpecContextRequiredException } from "../Exceptions/CliRunnerExceptions";
import type { CliInvocation } from "../Models/CliInvocation";

export type BuildCliInvocationInput = {
  profile: CliProfile;
  prompt: string;
  /** Spec trong context, đường dẫn tương đối trong specsDir (= cwd của tiến trình). */
  contextFiles: string[];
};

/** Biến môi trường của server không chuyển cho CLI agent. */
const SERVER_ONLY_ENV = new Set(["DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);

/** `{prompt}` = yêu cầu của người dùng kèm danh sách spec trong context (spec Tab 2). */
export function buildCliPrompt(prompt: string, contextFiles: string[]): string {
  const lines = [prompt.trim()];
  if (contextFiles.length) {
    lines.push("", "Spec files in context (paths relative to the current directory):", ...contextFiles.map((f) => `- ${f}`));
  }
  lines.push("", "Edit the Markdown files in place in the current directory. The user reviews every change as a diff before it is saved.");
  const text = lines.join("\n");
  // Tránh CLI hiểu prompt là một flag khi `{prompt}` đứng riêng một tham số.
  return text.startsWith("-") ? ` ${text}` : text;
}

async function resolveBinary(bin: string): Promise<string | undefined> {
  if (!path.isAbsolute(bin)) return which(bin);
  try {
    await access(bin, constants.X_OK);
    return bin;
  } catch {
    return undefined;
  }
}

/**
 * Dựng lệnh chạy từ CLI profile: tách `command` (cho phép "npx @anthropic-ai/claude-code"), thay `{prompt}` / `{spec}` trong args
 * (mảng tham số, không qua shell), resolve env "secret:<ref>".
 */
export class BuildCliInvocationTask extends Task<BuildCliInvocationInput, CliInvocation> {
  async run({ profile, prompt, contextFiles }: BuildCliInvocationInput): Promise<CliInvocation> {
    const [bin, ...preArgs] = profile.command.trim().split(/\s+/);
    const command = await resolveBinary(bin);
    if (!command) throw new CliNotInstalledException({ command: bin });

    if (profile.args.some((a) => a.includes("{spec}")) && !contextFiles.length) {
      throw new CliSpecContextRequiredException({ profileId: profile.id });
    }
    const fullPrompt = buildCliPrompt(prompt, contextFiles);
    const args = [...preArgs, ...profile.args.map((a) => a.replaceAll("{prompt}", fullPrompt).replaceAll("{spec}", contextFiles[0] ?? ""))];

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && !SERVER_ONLY_ENV.has(key)) env[key] = value;
    }
    const secretValues: string[] = [];
    for (const [key, raw] of Object.entries(profile.env)) {
      const value = await resolveSecretValue(raw);
      if (value === undefined) {
        logger.warn({ profileId: profile.id, env: key }, "secret của CLI profile chưa có trong secret store, bỏ qua biến");
        continue;
      }
      env[key] = value;
      if (raw.startsWith("secret:")) secretValues.push(value);
    }
    return { command, args, env, secretValues };
  }
}
