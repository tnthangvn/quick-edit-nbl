import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonDataDriver, setDataDriverForTesting } from "@/ship/adapters/data";
import { AppException } from "@/ship/parents/AppException";
import { CreateWorkspaceRecordTask } from "../../Workspace/Tasks/CreateWorkspaceRecordTask";
import { GetWorkspaceTask } from "../../Workspace/Tasks/GetWorkspaceTask";
import { GetEffectiveAgentSettingsAction } from "../Actions/GetEffectiveAgentSettingsAction";
import { ListWorkspaceSecretsAction } from "../Actions/ListWorkspaceSecretsAction";
import { UpdateSettingsAction, type UpdateSettingsInput } from "../Actions/UpdateSettingsAction";
import { WriteWorkspaceSecretAction } from "../Actions/WriteWorkspaceSecretAction";
import { DEFAULT_CLI_PROFILES } from "../Models/defaultAgentSettings";
import { DEFAULT_NOTEBOOK_CONFIG, type WorkspaceConfig } from "../Models/WorkspaceConfig";
import { CheckSecretsPresenceTask } from "../Tasks/CheckSecretsPresenceTask";
import { GetAgentSettingsTask } from "../Tasks/GetAgentSettingsTask";
import { ReadWorkspaceConfigTask } from "../Tasks/ReadWorkspaceConfigTask";
import { SaveAgentSettingsTask } from "../Tasks/SaveAgentSettingsTask";
import { WriteSecretTask } from "../Tasks/WriteSecretTask";
import { WriteWorkspaceConfigTask } from "../Tasks/WriteWorkspaceConfigTask";
import { UpdateSettingsBody } from "../UI/API/Requests/UpdateSettingsRequest";
import { AgentSettingsTransformer } from "../UI/API/Transformers/AgentSettingsTransformer";
import { MemorySecrets } from "./memorySecrets";

const settingsInput = (over: Partial<UpdateSettingsInput["api"]> = {}): UpdateSettingsInput => ({
  activeMode: "API",
  api: { provider: "GOOGLE", model: "gemini-pro-latest", baseUrl: null, temperature: 0.2, systemPrompt: "x", ...over },
  cli: { activeProfileId: "codex", streamStdout: true, permissionMode: "DEFAULT", profiles: DEFAULT_CLI_PROFILES },
});

describe("Setting", () => {
  let tmp: string;
  let store: MemorySecrets;
  const update = () => new UpdateSettingsAction(new WriteSecretTask(store), new CheckSecretsPresenceTask(store), new SaveAgentSettingsTask());

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "spec-studio-setting-"));
    setDataDriverForTesting(new JsonDataDriver(path.join(tmp, "data")));
    store = new MemorySecrets();
  });
  afterEach(() => {
    setDataDriverForTesting(undefined);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("mặc định: API + GOOGLE, đủ 5 CLI profile theo spec Tab 2", async () => {
    const s = await new GetAgentSettingsTask().run();
    expect(s.activeMode).toBe("API");
    expect(s.api).toMatchObject({ provider: "GOOGLE", apiKeyRef: null });
    expect(s.cli.profiles.map((p) => [p.id, p.command, p.outputFormat])).toEqual([
      ["claude-code", "claude", "STREAM_JSON"],
      ["codex", "codex", "JSONL"],
      ["antigravity", "agy", "STREAM_JSON"],
      ["aider", "aider", "TEXT"],
      ["custom", "./spec-agent.sh", "TEXT"],
    ]);
    expect(s.cli.profiles.every((p) => p.args.includes("{prompt}"))).toBe(true);
  });

  it("API key chỉ ghi: lưu theo provider, response chỉ có hasApiKey", async () => {
    const saved = await update().run({ ...settingsInput(), api: { ...settingsInput().api, apiKey: "sk-secret" } });
    expect(saved.api.apiKeyRef).toBe("llm:GOOGLE");
    expect(store.data.get("llm:GOOGLE")).toBe("sk-secret");
    const view = new AgentSettingsTransformer().transform(saved);
    expect(view.api.hasApiKey).toBe(true);
    expect(JSON.stringify(view)).not.toContain("sk-secret");
    expect(JSON.stringify(view)).not.toContain("apiKeyRef");

    // Đổi provider chưa có key → không có ref; quay lại GOOGLE → dùng lại key cũ.
    expect((await update().run(settingsInput({ provider: "OPENAI", model: "gpt" }))).api.apiKeyRef).toBeNull();
    expect((await update().run(settingsInput())).api.apiKeyRef).toBe("llm:GOOGLE");
    expect((await update().run({ ...settingsInput(), api: { ...settingsInput().api, apiKey: null } })).api.apiKeyRef).toBeNull();
    expect(store.data.has("llm:GOOGLE")).toBe(false);
  });

  it("validate: activeProfileId phải có trong profiles, id không trùng", () => {
    const body = { ...settingsInput(), cli: { ...settingsInput().cli, activeProfileId: "missing", profiles: [DEFAULT_CLI_PROFILES[0], DEFAULT_CLI_PROFILES[0]] } };
    const messages = UpdateSettingsBody.safeParse(body).error?.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(["SETTING.CLI_PROFILE_DUPLICATE", "SETTING.CLI_PROFILE_NOT_FOUND"]));
  });

  it("config.json: ghi nguyên tử, đọc lại; sai định dạng → WORKSPACE.CONFIG_INVALID; specsDir thoát ra ngoài bị chặn", async () => {
    const dir = path.join(tmp, "ws");
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { id: "ws1", name: "W", specsDir: "./specs" },
      storage: { git: null, drive: null },
      nbl: DEFAULT_NOTEBOOK_CONFIG,
      agent: { activeMode: "CLI", cli: { activeProfileId: "aider" } },
    };
    await new WriteWorkspaceConfigTask().run({ workspacePath: dir, config });
    expect(await new ReadWorkspaceConfigTask().run({ workspacePath: dir })).toEqual(config);
    expect(await new ReadWorkspaceConfigTask().run({ workspacePath: path.join(tmp, "none") })).toBeUndefined();

    mkdirSync(path.join(tmp, "bad/.spec-studio"), { recursive: true });
    writeFileSync(path.join(tmp, "bad/.spec-studio/config.json"), JSON.stringify({ ...config, workspace: { ...config.workspace, specsDir: "../../etc" } }));
    const err = await new ReadWorkspaceConfigTask().run({ workspacePath: path.join(tmp, "bad") }).catch((e) => e);
    expect(err instanceof AppException && err.code).toBe("WORKSPACE.CONFIG_INVALID");
  });

  it("AgentSettingsProvider: áp phần ghi đè của Workspace; secret Workspace chỉ trả boolean", async () => {
    const dir = path.join(tmp, "ws2");
    const ws = await new CreateWorkspaceRecordTask().run({
      name: "W2",
      description: null,
      path: dir,
      specs_dir: "./specs",
      storage_type: "LOCAL",
      storage_label: null,
      notebook_id: null,
      status: "ACTIVE",
      last_opened_at: null,
    });
    await new WriteWorkspaceConfigTask().run({
      workspacePath: dir,
      config: {
        version: 1,
        workspace: { id: ws.id, name: "W2", specsDir: "./specs" },
        storage: { git: null, drive: null },
        nbl: DEFAULT_NOTEBOOK_CONFIG,
        agent: { activeMode: "CLI", cli: { activeProfileId: "aider" }, api: { provider: "ANTHROPIC" } },
      },
    });
    const effective = await new GetEffectiveAgentSettingsAction(
      new GetAgentSettingsTask(),
      new GetWorkspaceTask(),
      new ReadWorkspaceConfigTask(),
      new CheckSecretsPresenceTask(store),
    ).run({ workspaceId: ws.id });
    expect(effective.activeMode).toBe("CLI");
    expect(effective.cli.activeProfileId).toBe("aider");
    expect(effective.api).toMatchObject({ provider: "ANTHROPIC", apiKeyRef: null });

    await new WriteWorkspaceSecretAction(new GetWorkspaceTask(), new WriteSecretTask(store)).run({ workspaceId: ws.id, kind: "NOTEBOOK_COOKIE", value: "SID=1" });
    const list = await new ListWorkspaceSecretsAction(new GetWorkspaceTask(), new CheckSecretsPresenceTask(store)).run({ workspaceId: ws.id });
    expect(list.find((s) => s.kind === "NOTEBOOK_COOKIE")).toEqual({ kind: "NOTEBOOK_COOKIE", isSet: true });
    expect(list.find((s) => s.kind === "GIT_TOKEN")?.isSet).toBe(false);
    expect(store.data.get(`${ws.id}:notebook_cookie`)).toBe("SID=1");
  });
});
