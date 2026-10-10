import "server-only";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/ship/adapters/logger";
import { which } from "@/ship/adapters/process";
import { resolveSecretValue } from "@/ship/adapters/secrets";
import type { CliProfile } from "@/ship/contracts/agentSettings";
import type { CliEffort, CliPermissionMode } from "@/ship/contracts/enums/agent";
import { Task } from "@/ship/parents/Task";
import { CliNotInstalledException, CliPermissionUnsupportedException, CliSpecContextRequiredException } from "../Exceptions/CliRunnerExceptions";
import type { CliInvocation } from "../Models/CliInvocation";

export type BuildCliInvocationInput = {
  profile: CliProfile;
  prompt: string;
  /** Spec trong context, đường dẫn tương đối trong specsDir (= cwd của tiến trình). */
  contextFiles: string[];
  /** Id phiên CLI của lượt trước trong cùng session → nối tiếp hội thoại. */
  resumeId?: string | null;
  /** Mức quyền chọn trên toolbar; DEFAULT / bỏ trống = theo args của profile. */
  permissionMode?: CliPermissionMode;
  /** Effort chọn trên toolbar; DEFAULT / bỏ trống / CLI không hỗ trợ = không truyền cờ. */
  effort?: CliEffort;
};

/** Cờ quyền của từng CLI: bị gỡ khỏi args của profile khi chọn mức khác DEFAULT. `true` = cờ có kèm giá trị. */
const PERMISSION_FLAGS: Partial<Record<CliProfile["kind"], Record<string, boolean>>> = {
  CLAUDE_CODE: { "--dangerously-skip-permissions": false, "--allow-dangerously-skip-permissions": false, "--permission-mode": true },
  ANTIGRAVITY: { "--dangerously-skip-permissions": false, "--mode": true },
  CODEX: { "--dangerously-bypass-approvals-and-sandbox": false, "--full-auto": false, "--sandbox": true, "-s": true },
};

/**
 * Cờ của từng mức theo loại CLI. Antigravity headless chỉ có Bypass: `--mode plan|accept-edits` vẫn từ chối mọi lệnh
 * (không hỏi được), còn thêm `--dangerously-skip-permissions` thì mode bị bỏ qua (vẫn chạy lệnh, vẫn ghi file).
 */
const PERMISSION_ARGS: Partial<Record<CliProfile["kind"], Partial<Record<Exclude<CliPermissionMode, "DEFAULT">, string[]>>>> = {
  CLAUDE_CODE: {
    PLAN: ["--permission-mode", "plan"],
    ACCEPT_EDITS: ["--permission-mode", "acceptEdits"],
    BYPASS: ["--dangerously-skip-permissions"],
  },
  ANTIGRAVITY: {
    BYPASS: ["--dangerously-skip-permissions"],
  },
  CODEX: {
    PLAN: ["--sandbox", "read-only"],
    ACCEPT_EDITS: ["--sandbox", "workspace-write"],
    BYPASS: ["--dangerously-bypass-approvals-and-sandbox"],
  },
};

/** Mức quyền chạy được với loại CLI; `null` = loại không đổi cờ quyền (Aider, Custom: luôn theo args của profile). */
export function supportedPermissionModes(kind: CliProfile["kind"]): CliPermissionMode[] | null {
  const args = PERMISSION_ARGS[kind];
  if (!args) return null;
  return ["DEFAULT", ...(Object.keys(args) as Exclude<CliPermissionMode, "DEFAULT">[])];
}

/**
 * Thay cờ quyền trong args của profile bằng cờ của mức đã chọn (args thô, trước `withResumeArgs`).
 * Codex: cờ đặt ngay sau `exec` (subcommand). Loại không hỗ trợ (Aider, Custom) hoặc DEFAULT: giữ nguyên.
 */
export function withPermissionArgs(kind: CliProfile["kind"], args: readonly string[], mode: CliPermissionMode | undefined): string[] {
  const flags = PERMISSION_FLAGS[kind];
  const added = mode && mode !== "DEFAULT" ? PERMISSION_ARGS[kind]?.[mode] : undefined;
  if (!flags || !added) return [...args];
  const kept: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const [flag] = args[i].split("=", 1);
    if (!(flag in flags)) kept.push(args[i]);
    else if (flags[flag] && !args[i].includes("=")) i++;
  }
  if (kind === "CODEX" && kept[0] === "exec") return ["exec", ...added, ...kept.slice(1)];
  return [...kept, ...added];
}

const EFFORT_VALUE: Record<Exclude<CliEffort, "DEFAULT">, string> = { LOW: "low", MEDIUM: "medium", HIGH: "high", XHIGH: "xhigh", MAX: "max" };
/** Codex chỉ có tới high. */
const CODEX_EFFORT: Record<Exclude<CliEffort, "DEFAULT">, string> = { LOW: "low", MEDIUM: "medium", HIGH: "high", XHIGH: "high", MAX: "high" };

/** Loại CLI chỉnh được effort (khớp toolbar FE). */
export function supportsEffort(kind: CliProfile["kind"]): boolean {
  return kind === "CLAUDE_CODE" || kind === "ANTIGRAVITY" || kind === "CODEX";
}

/**
 * Thay / thêm cờ effort theo loại CLI (args thô, trước `withResumeArgs`). DEFAULT giữ nguyên args của profile.
 * Claude Code, Antigravity: `--effort <mức>`; Codex: `exec -c model_reasoning_effort="<mức>" …`.
 */
export function withEffortArgs(kind: CliProfile["kind"], args: readonly string[], effort: CliEffort | undefined): string[] {
  if (!effort || effort === "DEFAULT" || !supportsEffort(kind)) return [...args];
  if (kind === "CODEX") {
    const kept: string[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-c" && args[i + 1]?.startsWith("model_reasoning_effort=")) i++;
      else kept.push(args[i]);
    }
    const flag = ["-c", `model_reasoning_effort="${CODEX_EFFORT[effort]}"`];
    return kept[0] === "exec" ? ["exec", ...flag, ...kept.slice(1)] : [...flag, ...kept];
  }
  const kept: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--effort") i++;
    else if (!args[i].startsWith("--effort=")) kept.push(args[i]);
  }
  return [...kept, "--effort", EFFORT_VALUE[effort]];
}

/**
 * Claude Code `--output-format stream-json`: thêm `--include-partial-messages` (text / thinking hiện dần) nếu profile
 * chưa có, để profile đã lưu từ bản cũ cũng được stream.
 */
export function withStreamingArgs(kind: CliProfile["kind"], args: readonly string[]): string[] {
  if (kind !== "CLAUDE_CODE" || args.includes("--include-partial-messages")) return [...args];
  const streamJson = args.some((a, i) => a === "--output-format=stream-json" || (a === "--output-format" && args[i + 1] === "stream-json"));
  return streamJson ? [...args, "--include-partial-messages"] : [...args];
}

/**
 * Chèn cờ nối phiên theo loại CLI (args thô, trước khi thay `{prompt}`). Loại không hỗ trợ (Aider, Custom) giữ nguyên.
 * Codex: `exec … {prompt}` → `exec resume … <id> {prompt}`; `exec resume` không nhận `--sandbox` nên đổi sang `-c sandbox_mode=`.
 */
export function withResumeArgs(kind: CliProfile["kind"], args: readonly string[], resumeId: string | null | undefined): string[] {
  if (!resumeId) return [...args];
  switch (kind) {
    case "CLAUDE_CODE":
      return [...args, "--resume", resumeId];
    case "ANTIGRAVITY":
      return [...args, "--conversation", resumeId];
    case "CODEX": {
      if (args[0] !== "exec") return [...args];
      const options: string[] = [];
      const promptArgs: string[] = [];
      const rest = args.slice(1);
      for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (a.includes("{prompt}")) promptArgs.push(a);
        else if (a === "--sandbox" && i + 1 < rest.length) options.push("-c", `sandbox_mode="${rest[++i]}"`);
        else if (a.startsWith("--sandbox=")) options.push("-c", `sandbox_mode="${a.slice("--sandbox=".length)}"`);
        else options.push(a);
      }
      return ["exec", "resume", ...options, resumeId, ...promptArgs];
    }
    default:
      return [...args];
  }
}

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
  async run({ profile, prompt, contextFiles, resumeId, permissionMode, effort }: BuildCliInvocationInput): Promise<CliInvocation> {
    const [bin, ...preArgs] = profile.command.trim().split(/\s+/);
    const command = await resolveBinary(bin);
    if (!command) throw new CliNotInstalledException({ command: bin });

    if (profile.args.some((a) => a.includes("{spec}")) && !contextFiles.length) {
      throw new CliSpecContextRequiredException({ profileId: profile.id });
    }
    const supported = supportedPermissionModes(profile.kind);
    if (permissionMode && supported && !supported.includes(permissionMode)) {
      throw new CliPermissionUnsupportedException({ mode: permissionMode, profileId: profile.id });
    }
    const fullPrompt = buildCliPrompt(prompt, contextFiles);
    const rawArgs = withResumeArgs(profile.kind, withEffortArgs(profile.kind, withStreamingArgs(profile.kind, withPermissionArgs(profile.kind, profile.args, permissionMode)), effort), resumeId);
    const args = [...preArgs, ...rawArgs.map((a) => a.replaceAll("{prompt}", fullPrompt).replaceAll("{spec}", contextFiles[0] ?? ""))];

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
