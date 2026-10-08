import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { APICallError } from "ai";
import { convertReadableStreamToArray, MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonDataDriver, setDataDriverForTesting } from "@/ship/adapters/data";
import type { AgentSettings } from "@/ship/contracts/agentSettings";
import type { SpecProposedEvent } from "@/ship/contracts/events";
import type { AgentSettingsAccess, SpecAccess } from "@/ship/contracts/studioAccess";
import { AppException } from "@/ship/parents/AppException";
import { StreamChatAction } from "../Actions/StreamChatAction";
import { ApiKeyMissingException, toLlmException } from "../Exceptions/LlmExceptions";
import { BuildChatInstructionsTask } from "../Tasks/BuildChatInstructionsTask";
import { CreateChatToolsTask } from "../Tasks/CreateChatToolsTask";
import type { CreateLanguageModelTask } from "../Tasks/CreateLanguageModelTask";
import { ResolveApiKeyTask } from "../Tasks/ResolveApiKeyTask";
import { CreateAgentSessionTask } from "../../Session/Tasks/CreateAgentSessionTask";
import { GetAgentSessionTask } from "../../Session/Tasks/GetAgentSessionTask";

class FakeSpecNotFound extends AppException {
  readonly code = "RESOURCE.NOT_FOUND";
  readonly status = 404;
}

function fakeSpecs(files: Record<string, string>): SpecAccess {
  return {
    getWorkspace: async (id) => ({ id, name: "Demo", path: "/tmp/demo", specsDir: "specs" }),
    listSpecs: async () => Object.keys(files).map((file) => ({ file, size: files[file].length, updatedAt: "2026-10-08T00:00:00.000Z" })),
    readSpec: async (_ws, file) => {
      if (!(file in files)) throw new FakeSpecNotFound({ file });
      return files[file];
    },
  };
}

function fakeBus() {
  const events: SpecProposedEvent[] = [];
  return { events, emit: <T>(_name: string, payload: T) => void events.push(payload as SpecProposedEvent) };
}

const settings = (api: Partial<AgentSettings["api"]> = {}): AgentSettingsAccess => ({
  get: async () => ({
    activeMode: "API",
    api: { provider: "GOOGLE", model: "gemini-test", baseUrl: null, temperature: 0.2, systemPrompt: "Bạn là trợ lý viết spec.", apiKeyRef: "llm:google", ...api },
    cli: { activeProfileId: "", streamStdout: true, permissionMode: "DEFAULT", profiles: [] },
  }),
});

const toolOpts = { toolCallId: "call_1", messages: [], context: {} } as never;

describe("BuildChatInstructionsTask", () => {
  it("ghép preset, quy tắc và nội dung spec trong context", async () => {
    const text = await new BuildChatInstructionsTask().run({
      systemPrompt: "Preset X",
      workspaceName: "Demo",
      specs: [{ file: "auth/login.md", content: "# Login" }],
    });
    expect(text).toContain("Preset X");
    expect(text).toContain("propose_spec_update");
    expect(text).toContain('<spec file="auth/login.md">\n# Login\n</spec>');
  });

  it("không có spec thì không có mục context", async () => {
    const text = await new BuildChatInstructionsTask().run({ systemPrompt: "", workspaceName: "Demo", specs: [] });
    expect(text).not.toContain("Context specs");
  });
});

describe("CreateChatToolsTask", () => {
  it("chỉ cấp list_specs, read_spec, propose_spec_update", async () => {
    const tools = await new CreateChatToolsTask(fakeSpecs({}), fakeBus()).run({ workspaceId: "ws1" });
    expect(Object.keys(tools).sort()).toEqual(["list_specs", "propose_spec_update", "read_spec"]);
  });

  it("propose_spec_update phát SPEC_PROPOSED với nội dung gốc, không ghi file", async () => {
    const bus = fakeBus();
    const tools = await new CreateChatToolsTask(fakeSpecs({ "a.md": "old" }), bus).run({ workspaceId: "ws1" });
    const out = await tools.propose_spec_update.execute!({ filename: "a.md", newContent: "new" }, toolOpts);
    expect(out).toMatchObject({ proposed: true, filename: "a.md", isNewFile: false });
    expect(bus.events).toEqual([{ type: "SPEC_PROPOSED", workspaceId: "ws1", file: "a.md", original: "old", proposed: "new", sourceId: "call_1" }]);
  });

  it("file mới: original rỗng; nội dung không đổi: không phát event", async () => {
    const bus = fakeBus();
    const tools = await new CreateChatToolsTask(fakeSpecs({ "a.md": "same" }), bus).run({ workspaceId: "ws1" });
    expect(await tools.propose_spec_update.execute!({ filename: "new.md", newContent: "x" }, toolOpts)).toMatchObject({ isNewFile: true });
    expect(await tools.propose_spec_update.execute!({ filename: "a.md", newContent: "same" }, toolOpts)).toMatchObject({ proposed: false });
    expect(bus.events.map((e) => [e.file, e.original])).toEqual([["new.md", ""]]);
  });

  it("lỗi nghiệp vụ trả mã cho model thay vì ném", async () => {
    const tools = await new CreateChatToolsTask(fakeSpecs({}), fakeBus()).run({ workspaceId: "ws1" });
    expect(await tools.read_spec.execute!({ filename: "missing.md" }, toolOpts)).toEqual({ error: "RESOURCE.NOT_FOUND" });
  });

  it("filename phải là đường dẫn .md tương đối trong thư mục spec", async () => {
    const tools = await new CreateChatToolsTask(fakeSpecs({}), fakeBus()).run({ workspaceId: "ws1" });
    const schema = tools.read_spec.inputSchema as unknown as { safeParse: (v: unknown) => { success: boolean } };
    for (const bad of ["../x.md", "/etc/x.md", "a.txt", "a\\b.md", ""]) expect(schema.safeParse({ filename: bad }).success, bad).toBe(false);
    expect(schema.safeParse({ filename: "dir/a.md" }).success).toBe(true);
  });
});

describe("ResolveApiKeyTask", () => {
  const store = { get: async (ref: string) => (ref === "llm:google" ? "k-google" : undefined), set: async () => {}, delete: async () => {} };

  it("ưu tiên key người dùng vừa nhập, rồi tới key đã lưu", async () => {
    const task = new ResolveApiKeyTask(store);
    expect(await task.run({ provider: "GOOGLE", override: "typed", apiKeyRef: "llm:google" })).toBe("typed");
    expect(await task.run({ provider: "GOOGLE", apiKeyRef: "llm:google" })).toBe("k-google");
  });

  it("thiếu key → AGENT.API_KEY_MISSING, trừ OLLAMA", async () => {
    const task = new ResolveApiKeyTask(store);
    await expect(task.run({ provider: "OPENAI", apiKeyRef: "llm:openai" })).rejects.toBeInstanceOf(ApiKeyMissingException);
    await expect(task.run({ provider: "ANTHROPIC", apiKeyRef: null })).rejects.toBeInstanceOf(ApiKeyMissingException);
    expect(await task.run({ provider: "OLLAMA", apiKeyRef: null })).toBeUndefined();
  });
});

describe("toLlmException", () => {
  const apiError = (statusCode: number | undefined, responseBody = "") =>
    new APICallError({ message: "secret detail", url: "https://x", requestBodyValues: {}, statusCode, responseBody });

  it.each([
    [401, "", "AGENT.LLM_AUTH_FAILED"],
    [400, '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}', "AGENT.LLM_AUTH_FAILED"],
    [404, "", "AGENT.MODEL_NOT_FOUND"],
    [429, "", "AGENT.LLM_RATE_LIMITED"],
    [500, "", "AGENT.LLM_REQUEST_FAILED"],
    [undefined, "", "AGENT.LLM_UNREACHABLE"],
  ])("HTTP %s → %s", (status, body, code) => {
    expect(toLlmException(apiError(status, body), { model: "m" }).code).toBe(code);
  });

  it("lỗi mạng (fetch failed) → AGENT.LLM_UNREACHABLE", () => {
    expect(toLlmException(new TypeError("fetch failed"), { model: "m" }).code).toBe("AGENT.LLM_UNREACHABLE");
  });
});

describe("StreamChatAction", () => {
  let tmp: string;
  let sessionId: string;
  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "chat-test-"));
    setDataDriverForTesting(new JsonDataDriver(tmp));
    sessionId = (await new CreateAgentSessionTask().run({ workspaceId: "ws1" })).id;
  });
  afterEach(async () => {
    setDataDriverForTesting(undefined);
    await rm(tmp, { recursive: true, force: true });
  });
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };
  const stream = <T>(parts: T[]) =>
    new ReadableStream<T>({
      start(c) {
        parts.forEach((p) => c.enqueue(p));
        c.close();
      },
    });
  const userMessage = [{ id: "u1", role: "user", parts: [{ type: "text", text: "Sửa a.md" }] }];

  function action(model: MockLanguageModelV4, specs: SpecAccess, bus = fakeBus()) {
    const createModel = { run: async () => model } as unknown as CreateLanguageModelTask;
    const store = { get: async () => "k", set: async () => {}, delete: async () => {} };
    return new StreamChatAction(
      specs,
      settings(),
      new ResolveApiKeyTask(store),
      createModel,
      undefined,
      undefined,
      new CreateChatToolsTask(specs, bus),
    );
  }

  it("đưa spec context vào system prompt, gọi propose tool và stream kết quả", async () => {
    const bus = fakeBus();
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: stream([
            { type: "stream-start", warnings: [] },
            { type: "tool-call", toolCallId: "tc1", toolName: "propose_spec_update", input: JSON.stringify({ filename: "a.md", newContent: "# New" }) },
            { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
          ]),
        },
        {
          stream: stream([
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "Đã đề xuất." },
            { type: "text-end", id: "t1" },
            { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
          ]),
        },
      ],
    });
    const specs = fakeSpecs({ "a.md": "# Old" });
    const chunks = await convertReadableStreamToArray(
      await action(model, specs, bus).run({ workspaceId: "ws1", sessionId, messages: userMessage, contextFiles: ["a.md"] }),
    );

    const system = model.doStreamCalls[0].prompt[0];
    expect(system.role).toBe("system");
    expect(JSON.stringify(system.content)).toContain("# Old");
    expect(model.doStreamCalls[0].temperature).toBe(0.2);
    expect(chunks.map((c) => c.type)).toContain("tool-output-available");
    expect(chunks).toContainEqual(expect.objectContaining({ type: "text-delta", delta: "Đã đề xuất." }));
    expect(bus.events).toEqual([expect.objectContaining({ file: "a.md", original: "# Old", proposed: "# New", sourceId: "tc1" })]);

    // Stream xong → hội thoại (user + assistant) được lưu vào session, tiêu đề lấy từ prompt đầu.
    await vi.waitFor(async () => {
      const saved = await new GetAgentSessionTask().run({ sessionId });
      expect(saved.messages.items.map((m) => m.role)).toEqual(["user", "assistant"]);
      expect(saved.title).toBe("Sửa a.md");
    });
  });

  it("session của workspace khác → AGENT.SESSION_NOT_FOUND", async () => {
    await expect(
      action(new MockLanguageModelV4(), fakeSpecs({})).run({ workspaceId: "ws2", sessionId, messages: userMessage, contextFiles: [] }),
    ).rejects.toMatchObject({ code: "AGENT.SESSION_NOT_FOUND" });
  });

  it("lỗi provider giữa stream → chunk error với errorText là mã lỗi, không lộ message gốc", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new APICallError({ message: "sk-leak", url: "https://x", requestBodyValues: {}, statusCode: 401, isRetryable: false });
      },
    });
    const chunks = await convertReadableStreamToArray(
      await action(model, fakeSpecs({})).run({ workspaceId: "ws1", sessionId, messages: userMessage, contextFiles: [] }),
    );
    expect(chunks).toContainEqual({ type: "error", errorText: "AGENT.LLM_AUTH_FAILED" });
    expect(JSON.stringify(chunks)).not.toContain("sk-leak");
  });

  it("messages sai định dạng → AGENT.INVALID_MESSAGES", async () => {
    const model = new MockLanguageModelV4();
    await expect(
      action(model, fakeSpecs({})).run({ workspaceId: "ws1", sessionId, messages: [{ id: "x", role: "robot", parts: [] }], contextFiles: [] }),
    ).rejects.toMatchObject({ code: "AGENT.INVALID_MESSAGES" });
  });
});
