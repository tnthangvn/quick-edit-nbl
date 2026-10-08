import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AgentSettings, CliProfile } from "@/ship/contracts/agentSettings";
import type { SpecProposedEvent } from "@/ship/contracts/events";
import type { AgentSettingsAccess, SpecAccess } from "@/ship/contracts/studioAccess";
import { StartCliRunAction } from "../Actions/StartCliRunAction";
import { StopCliRunAction } from "../Actions/StopCliRunAction";
import { CliRunStore, type CliRun } from "../Data/Stores/CliRunStore";
import type { CliRunEvent } from "../Events/CliRunEvent";
import { parseCliLine } from "../Parsers/cliOutputParsers";
import { ExecuteCliRunSubAction } from "../SubActions/ExecuteCliRunSubAction";
import { BuildCliInvocationTask, buildCliPrompt } from "../Tasks/BuildCliInvocationTask";
import { CreateCliRunTask } from "../Tasks/CreateCliRunTask";
import { DiffSandboxTask } from "../Tasks/DiffSandboxTask";
import { DiscardCliRunTask } from "../Tasks/DiscardCliRunTask";
import { EmitSpecProposalTask } from "../Tasks/EmitSpecProposalTask";
import { GetCliRunTask } from "../Tasks/GetCliRunTask";
import { PrepareSandboxTask } from "../Tasks/PrepareSandboxTask";

const FAKE_CLI = path.join(__dirname, "fixtures", "fake-cli.mjs");

describe("parseCliLine", () => {
  it("STREAM_JSON (Claude Code): text → MESSAGE, tool_use → TOOL_CALL, system/result ok → bỏ qua", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Hi" }, { type: "tool_use", name: "Edit", input: { file_path: "a.md" } }] },
    });
    expect(parseCliLine("STREAM_JSON", line)).toEqual([
      { type: "MESSAGE", text: "Hi", delta: false },
      { type: "TOOL_CALL", name: "Edit", input: '{"file_path":"a.md"}' },
    ]);
    expect(parseCliLine("STREAM_JSON", '{"type":"system","subtype":"init"}')).toEqual([]);
    expect(parseCliLine("STREAM_JSON", '{"type":"result","subtype":"success","is_error":false}')).toEqual([]);
    expect(parseCliLine("STREAM_JSON", '{"type":"result","subtype":"error_max_turns","is_error":true}')).toEqual([
      { type: "LOG", stream: "STDERR", text: "error_max_turns" },
    ]);
  });

  it("STREAM_JSON (Antigravity / Gemini): message delta, tool_use, error", () => {
    expect(parseCliLine("STREAM_JSON", '{"type":"message","role":"assistant","content":"He","delta":true}')).toEqual([
      { type: "MESSAGE", text: "He", delta: true },
    ]);
    expect(parseCliLine("STREAM_JSON", '{"type":"message","role":"user","content":"x"}')).toEqual([]);
    expect(parseCliLine("STREAM_JSON", '{"type":"tool_use","tool_name":"write_file","parameters":{"path":"a.md"}}')).toEqual([
      { type: "TOOL_CALL", name: "write_file", input: '{"path":"a.md"}' },
    ]);
    expect(parseCliLine("STREAM_JSON", '{"type":"error","message":"authentication required"}')).toEqual([
      { type: "LOG", stream: "STDERR", text: "authentication required" },
    ]);
  });

  it("JSONL (codex exec --json)", () => {
    expect(parseCliLine("JSONL", '{"type":"item.completed","item":{"id":"1","type":"agent_message","text":"Xong"}}')).toEqual([
      { type: "MESSAGE", text: "Xong", delta: false },
    ]);
    expect(parseCliLine("JSONL", '{"type":"item.started","item":{"id":"2","type":"command_execution","command":"ls"}}')).toEqual([
      { type: "TOOL_CALL", name: "command_execution", input: "ls" },
    ]);
    expect(
      parseCliLine("JSONL", '{"type":"item.completed","item":{"type":"file_change","changes":[{"path":"a.md","kind":"update"}]}}'),
    ).toEqual([{ type: "TOOL_CALL", name: "file_change", input: "update a.md" }]);
    expect(parseCliLine("JSONL", '{"type":"turn.failed","error":{"message":"boom"}}')).toEqual([{ type: "LOG", stream: "STDERR", text: "boom" }]);
    expect(parseCliLine("JSONL", '{"type":"turn.completed","usage":{}}')).toEqual([]);
  });

  it("dòng không phải JSON → LOG; TEXT → LOG; dòng trống bỏ qua", () => {
    expect(parseCliLine("STREAM_JSON", "plain text")).toEqual([{ type: "LOG", stream: "STDOUT", text: "plain text" }]);
    expect(parseCliLine("TEXT", '{"type":"assistant"}')).toEqual([{ type: "LOG", stream: "STDOUT", text: '{"type":"assistant"}' }]);
    expect(parseCliLine("JSONL", "   ")).toEqual([]);
  });

  it("input tool dài bị cắt ngắn", () => {
    const [event] = parseCliLine("STREAM_JSON", JSON.stringify({ type: "tool_use", name: "w", input: "x".repeat(1000) }));
    expect(event.type === "TOOL_CALL" && event.input.length).toBeLessThanOrEqual(301);
  });
});

describe("BuildCliInvocationTask", () => {
  const profile = (over: Partial<CliProfile> = {}): CliProfile => ({
    id: "p1",
    name: "Fake",
    kind: "CUSTOM",
    command: process.execPath,
    args: ["--file", "{spec}", "--prompt", "{prompt}"],
    outputFormat: "TEXT",
    env: { PLAIN: "v" },
    ...over,
  });

  it("thay {prompt}/{spec} trong mảng args, không qua shell", async () => {
    const inv = await new BuildCliInvocationTask().run({ profile: profile(), prompt: "Sửa; rm -rf /", contextFiles: ["a.md", "b.md"] });
    expect(inv.command).toBe(process.execPath);
    expect(inv.args[1]).toBe("a.md");
    expect(inv.args[3]).toContain("Sửa; rm -rf /");
    expect(inv.args[3]).toContain("- b.md");
    expect(inv.env.PLAIN).toBe("v");
    expect(inv.env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });

  it("thiếu binary → AGENT.CLI_NOT_INSTALLED; có {spec} mà không chọn spec → AGENT.CLI_SPEC_CONTEXT_REQUIRED", async () => {
    const task = new BuildCliInvocationTask();
    await expect(task.run({ profile: profile({ command: "definitely-not-a-cli-xyz" }), prompt: "x", contextFiles: [] })).rejects.toMatchObject({
      code: "AGENT.CLI_NOT_INSTALLED",
    });
    await expect(task.run({ profile: profile(), prompt: "x", contextFiles: [] })).rejects.toMatchObject({ code: "AGENT.CLI_SPEC_CONTEXT_REQUIRED" });
  });

  it("prompt bắt đầu bằng '-' không bị hiểu là flag", () => {
    expect(buildCliPrompt("--help", []).startsWith(" ")).toBe(true);
  });
});

describe("sandbox", () => {
  let tmp: string;
  let specsDir: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "cli-runner-test-"));
    specsDir = path.join(tmp, "specs");
    await mkdir(path.join(specsDir, "sub"), { recursive: true });
    await mkdir(path.join(specsDir, ".git"));
    await writeFile(path.join(specsDir, "a.md"), "# A\n");
    await writeFile(path.join(specsDir, "b.md"), "# B\n");
    await writeFile(path.join(specsDir, ".git", "x.md"), "git");
    await writeFile(path.join(tmp, "outside.md"), "secret");
    await symlink(path.join(tmp, "outside.md"), path.join(specsDir, "link.md"));
  });
  afterEach(() => rm(tmp, { recursive: true, force: true }));

  it("chép specsDir (bỏ .git và symlink), chỉ đề xuất file CLI đã sửa / tạo", async () => {
    const sandbox = await new PrepareSandboxTask().run({ specsDir });
    try {
      expect([...sandbox.baseline.keys()]).toEqual(["a.md", "b.md"]);
      await writeFile(path.join(sandbox.dir, "a.md"), "# A2\n");
      await writeFile(path.join(sandbox.dir, "sub", "c.md"), "# C\n");
      // Người dùng sửa b.md trên file thật trong lúc run: CLI không đụng b.md nên không được đề xuất ghi đè.
      await writeFile(path.join(specsDir, "b.md"), "# B user edit\n");

      const changes = await new DiffSandboxTask().run({ originalDir: specsDir, sandboxDir: sandbox.dir, baseline: sandbox.baseline });
      expect(changes).toEqual([
        { file: "a.md", original: "# A\n", proposed: "# A2\n", isNewFile: false },
        { file: "sub/c.md", original: "", proposed: "# C\n", isNewFile: true },
      ]);
    } finally {
      await rm(sandbox.root, { recursive: true, force: true });
    }
  });

  it("specsDir không tồn tại → AGENT.SANDBOX_FAILED", async () => {
    await expect(new PrepareSandboxTask().run({ specsDir: path.join(tmp, "nope") })).rejects.toMatchObject({ code: "AGENT.SANDBOX_FAILED" });
  });
});

describe("CLI run (fake CLI)", () => {
  let tmp: string;
  let store: CliRunStore;
  let proposals: SpecProposedEvent[];

  const settings = (profiles: CliProfile[], streamStdout = true): AgentSettingsAccess => ({
    get: async () =>
      ({
        activeMode: "CLI",
        api: { provider: "OLLAMA", model: "m", baseUrl: null, temperature: 0, systemPrompt: "", apiKeyRef: null },
        cli: { activeProfileId: profiles[0]?.id ?? "", streamStdout, profiles },
      }) satisfies AgentSettings,
  });
  const specs = (): SpecAccess => ({
    getWorkspace: async (id) => ({ id, name: "Demo", path: tmp, specsDir: "specs" }),
    listSpecs: async () => [],
    readSpec: async () => "",
  });
  const profile = (env: Record<string, string> = {}): CliProfile => ({
    id: "fake",
    name: "Fake",
    kind: "CUSTOM",
    command: process.execPath,
    args: [FAKE_CLI, "{prompt}"],
    outputFormat: "STREAM_JSON",
    env,
  });

  function start(p: CliProfile, opts: { streamStdout?: boolean; timeoutMs?: number } = {}) {
    const bus = { emit: <T>(_n: string, e: T) => void proposals.push(e as SpecProposedEvent) };
    return new StartCliRunAction(
      specs(),
      settings([p], opts.streamStdout),
      new CreateCliRunTask(store),
      new DiscardCliRunTask(store),
      undefined,
      undefined,
      new ExecuteCliRunSubAction(undefined, undefined, new EmitSpecProposalTask(bus)),
      opts.timeoutMs,
    );
  }

  const finished = (run: CliRun) =>
    new Promise<CliRunEvent[]>((resolve) => {
      const seen: CliRunEvent[] = [];
      run.subscribe((e) => {
        seen.push(e);
        if (e.type === "STATUS" && e.status !== "RUNNING") resolve(seen);
      });
    });

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "cli-run-test-"));
    await mkdir(path.join(tmp, "specs", "sub"), { recursive: true });
    await writeFile(path.join(tmp, "specs", "a.md"), "# A\n");
    store = new CliRunStore();
    proposals = [];
  });
  afterEach(() => rm(tmp, { recursive: true, force: true }));

  it("chạy trong sandbox, parse output, phát đề xuất, không ghi file thật", async () => {
    const { runId } = await start(profile()).run({ workspaceId: "ws1", profileId: "fake", prompt: "Viết lại A", contextFiles: ["a.md"] });
    const run = await new GetCliRunTask(store).run({ runId });
    const events = await finished(run);

    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i));
    expect(events).toContainEqual(expect.objectContaining({ type: "MESSAGE", text: "prompt:Viết lại A" }));
    expect(events).toContainEqual(expect.objectContaining({ type: "TOOL_CALL", name: "Edit" }));
    expect(events).toContainEqual(expect.objectContaining({ type: "LOG", stream: "STDERR", text: "warn on stderr" }));
    expect(events.filter((e) => e.type === "PROPOSAL")).toEqual([
      expect.objectContaining({ file: "a.md", isNewFile: false }),
      expect.objectContaining({ file: "sub/new.md", isNewFile: true }),
    ]);
    expect(events.at(-1)).toMatchObject({ type: "STATUS", status: "DONE", exitCode: 0, error: null });
    expect(proposals).toEqual([
      { type: "SPEC_PROPOSED", workspaceId: "ws1", file: "a.md", original: "# A\n", proposed: "# A edited by agent\n", sourceId: runId },
      { type: "SPEC_PROPOSED", workspaceId: "ws1", file: "sub/new.md", original: "", proposed: "# New file\n", sourceId: runId },
    ]);
    // File thật giữ nguyên.
    expect(await readFile(path.join(tmp, "specs", "a.md"), "utf8")).toBe("# A\n");
    // Client vào muộn nhận lại toàn bộ event.
    const replay: CliRunEvent[] = [];
    run.subscribe((e) => replay.push(e));
    expect(replay).toEqual(events);
  });

  it("exit code ≠ 0 → FAILED AGENT.CLI_EXIT_NONZERO, không đề xuất", async () => {
    const { runId } = await start(profile({ FAKE_EXIT: "3" })).run({ workspaceId: "ws1", profileId: "fake", prompt: "x", contextFiles: [] });
    const events = await finished(await new GetCliRunTask(store).run({ runId }));
    expect(events.at(-1)).toMatchObject({ status: "FAILED", exitCode: 3, error: { code: "AGENT.CLI_EXIT_NONZERO", params: { exitCode: 3 } } });
    expect(proposals).toEqual([]);
  });

  it("streamStdout tắt → không có LOG", async () => {
    const { runId } = await start(profile(), { streamStdout: false }).run({ workspaceId: "ws1", profileId: "fake", prompt: "x", contextFiles: [] });
    const events = await finished(await new GetCliRunTask(store).run({ runId }));
    expect(events.some((e) => e.type === "LOG")).toBe(false);
    expect(events.at(-1)).toMatchObject({ status: "DONE" });
  });

  it("một workspace một run (409), dừng được (STOPPED), dừng lại lần nữa không lỗi", async () => {
    const action = start(profile({ FAKE_SLEEP: "1" }));
    const { runId } = await action.run({ workspaceId: "ws1", profileId: "fake", prompt: "x", contextFiles: [] });
    await expect(action.run({ workspaceId: "ws1", profileId: "fake", prompt: "y", contextFiles: [] })).rejects.toMatchObject({
      code: "AGENT.RUN_ALREADY_ACTIVE",
    });

    const run = await new GetCliRunTask(store).run({ runId });
    const done = finished(run);
    const stop = new StopCliRunAction(new GetCliRunTask(store));
    await stop.run({ runId });
    expect((await done).at(-1)).toMatchObject({ status: "STOPPED" });
    await stop.run({ runId });
    expect(run.active).toBe(false);
  });

  it("quá thời gian → FAILED AGENT.CLI_TIMEOUT", async () => {
    const { runId } = await start(profile({ FAKE_SLEEP: "1" }), { timeoutMs: 300 }).run({
      workspaceId: "ws1",
      profileId: "fake",
      prompt: "x",
      contextFiles: [],
    });
    const events = await finished(await new GetCliRunTask(store).run({ runId }));
    expect(events.at(-1)).toMatchObject({ status: "FAILED", error: { code: "AGENT.CLI_TIMEOUT" } });
  });

  it("profile không tồn tại → AGENT.CLI_PROFILE_NOT_FOUND; run id lạ → AGENT.RUN_NOT_FOUND", async () => {
    await expect(start(profile()).run({ workspaceId: "ws1", profileId: "nope", prompt: "x", contextFiles: [] })).rejects.toMatchObject({
      code: "AGENT.CLI_PROFILE_NOT_FOUND",
    });
    await expect(new GetCliRunTask(store).run({ runId: "nope" })).rejects.toMatchObject({ code: "AGENT.RUN_NOT_FOUND" });
  });

  it("che giá trị secret nếu CLI in ra log", async () => {
    const run = store.create("ws2")!;
    const sandbox = await new PrepareSandboxTask().run({ specsDir: path.join(tmp, "specs") });
    const invocation = {
      command: process.execPath,
      args: [FAKE_CLI, "x"],
      env: { ...process.env, FAKE_TOKEN: "sk-very-secret" } as Record<string, string>,
      secretValues: ["sk-very-secret"],
    };
    const done = finished(run);
    await new ExecuteCliRunSubAction(undefined, undefined, new EmitSpecProposalTask({ emit: () => {} })).run({
      run,
      invocation,
      sandbox,
      specsDir: path.join(tmp, "specs"),
      outputFormat: "STREAM_JSON",
      streamStdout: true,
      timeoutMs: 10_000,
    });
    const events = await done;
    expect(events).toContainEqual(expect.objectContaining({ type: "LOG", text: "token=***" }));
    expect(JSON.stringify(events)).not.toContain("sk-very-secret");
  });
});
