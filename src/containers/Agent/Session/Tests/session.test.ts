import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonDataDriver, setDataDriverForTesting } from "@/ship/adapters/data";
import { sessionSandboxRoot } from "../../CliRunner/Models/Sandbox";
import { DeleteAgentSessionAction } from "../Actions/DeleteAgentSessionAction";
import { GetAgentSessionAction } from "../Actions/GetAgentSessionAction";
import { ListAgentSessionsAction } from "../Actions/ListAgentSessionsAction";
import { sessionTitleOf } from "../Models/AgentSession";
import { CreateAgentSessionTask } from "../Tasks/CreateAgentSessionTask";
import { SaveSessionMessagesTask } from "../Tasks/SaveSessionMessagesTask";
import { SaveSessionRunTask } from "../Tasks/SaveSessionRunTask";

describe("Agent session", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "agent-session-test-"));
    setDataDriverForTesting(new JsonDataDriver(tmp));
  });
  afterEach(async () => {
    setDataDriverForTesting(undefined);
    await rm(tmp, { recursive: true, force: true });
  });

  it("tiêu đề lấy dòng đầu của prompt, cắt 80 ký tự; prompt rỗng → null", () => {
    expect(sessionTitleOf("  Sửa spec A\nchi tiết")).toBe("Sửa spec A chi tiết");
    expect(sessionTitleOf("Nhớ số bí mật là 42. Không dùng tool, chỉ trả lời: OK")).toBe("Nhớ số bí mật là 42…");
    expect(sessionTitleOf("x".repeat(100))).toHaveLength(49);
    expect(sessionTitleOf("   ")).toBeNull();
  });

  it("History chỉ của workspace đó, dùng gần nhất trước; lưu tin nhắn đặt tiêu đề một lần", async () => {
    const create = new CreateAgentSessionTask();
    const a = await create.run({ workspaceId: "ws1" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await create.run({ workspaceId: "ws1" });
    await create.run({ workspaceId: "ws2" });

    await new Promise((r) => setTimeout(r, 5));
    const save = new SaveSessionMessagesTask();
    await save.run({ sessionId: a.id, messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "Câu đầu" }] }] });
    await save.run({ sessionId: a.id, messages: [{ id: "u2", role: "user", parts: [{ type: "text", text: "Câu khác" }] }] });

    const list = await new ListAgentSessionsAction().run({ workspaceId: "ws1" });
    expect(list.map((s) => s.id)).toEqual([a.id, b.id]);
    expect(list[0].title).toBe("Câu đầu");
  });

  it("xoá session: xoá run đã lưu và sandbox cố định", async () => {
    const s = await new CreateAgentSessionTask().run({ workspaceId: "ws1" });
    await new SaveSessionRunTask().run({
      id: "run-1",
      session_id: s.id,
      prompt: "Lượt CLI",
      profile_id: "claude",
      status: "DONE",
      exit_code: 0,
      error: null,
      events: { items: [] },
    });
    expect((await new GetAgentSessionAction().run({ sessionId: s.id })).runs).toHaveLength(1);
    await mkdir(sessionSandboxRoot(s.id), { recursive: true });

    await new DeleteAgentSessionAction().run({ sessionId: s.id });
    await expect(new GetAgentSessionAction().run({ sessionId: s.id })).rejects.toMatchObject({ code: "AGENT.SESSION_NOT_FOUND" });
    await expect(stat(sessionSandboxRoot(s.id))).rejects.toThrow();
  });
});
