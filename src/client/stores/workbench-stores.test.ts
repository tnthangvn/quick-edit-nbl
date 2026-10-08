import { describe, expect, it } from "vitest";
import type { CliRunEvent, PublishRun, PublishStepOutput } from "@/client/api/generated/model";
import { applyCliEvent, buildCliTimeline, newCliRun } from "./workbench-cli-store";
import { draftKey, withContext, withDraft, withoutFiles, withRename, type WorkbenchEditorState } from "./workbench-editor-store";
import { enqueueProposal, focusProposal, proposalKey, resolveProposal, type ProposalState } from "./workbench-proposal-store";
import { withActiveSession } from "./workbench-session-store";
import { headerSteps, panelRunning, panelSteps, seedRunList, summarizeSteps, upsertRun, usePublishStore, type PublishState } from "./workbench-publish-store";

const at = "2026-10-08T00:00:00.000Z";

describe("workbench-editor-store", () => {
  const empty: WorkbenchEditorState = { openFiles: {}, context: {}, drafts: {} };

  it("nháp trùng nội dung đã lưu thì bị xoá", () => {
    const s1 = { ...empty, ...withDraft(empty, "ws", "a.md", "x", "old") };
    expect(s1.drafts[draftKey("ws", "a.md")]).toBe("x");
    const s2 = { ...s1, ...withDraft(s1, "ws", "a.md", "old", "old") };
    expect(s2.drafts).toEqual({});
  });

  it("context thêm / bỏ không trùng", () => {
    const s1 = { ...empty, ...withContext(empty, "ws", "a.md", true) };
    expect(withContext(s1, "ws", "a.md", true)).toEqual({});
    const s2 = { ...s1, ...withContext(s1, "ws", "a.md", false) };
    expect(s2.context.ws).toEqual([]);
  });

  it("rename chuyển nháp, context, file đang mở", () => {
    const s: WorkbenchEditorState = { openFiles: { ws: "a.md" }, context: { ws: ["a.md", "b.md"] }, drafts: { [draftKey("ws", "a.md")]: "d" } };
    const next = { ...s, ...withRename(s, "ws", "a.md", "c.md") };
    expect(next.openFiles.ws).toBe("c.md");
    expect(next.context.ws).toEqual(["c.md", "b.md"]);
    expect(next.drafts).toEqual({ [draftKey("ws", "c.md")]: "d" });
  });

  it("prune bỏ file không còn, không đụng Workspace khác", () => {
    const s: WorkbenchEditorState = {
      openFiles: { ws: "gone.md" },
      context: { ws: ["gone.md", "a.md"] },
      drafts: { [draftKey("ws", "gone.md")]: "x", [draftKey("other", "gone.md")]: "y" },
    };
    const next = { ...s, ...withoutFiles(s, "ws", (f) => f === "a.md") };
    expect(next.openFiles.ws).toBeNull();
    expect(next.context.ws).toEqual(["a.md"]);
    expect(Object.keys(next.drafts)).toEqual([draftKey("other", "gone.md")]);
  });
});

describe("workbench-proposal-store", () => {
  const base = { workspaceId: "ws", file: "a.md", original: "o", proposed: "p", sourceId: "call-1" };
  const empty: ProposalState = { queue: [], handled: [] };

  it("gộp đề xuất cùng nguồn, giữ bản gốc đã có", () => {
    const s1 = enqueueProposal(empty, base, 1);
    const s2 = enqueueProposal(s1, { ...base, original: "", proposed: "p2" }, 2);
    expect(s2.queue).toHaveLength(1);
    expect(s2.queue[0]).toMatchObject({ original: "o", proposed: "p2", receivedAt: 1 });
  });

  it("đã xử lý thì không đưa lại; focus đưa lên đầu", () => {
    const s1 = enqueueProposal(enqueueProposal(empty, base), { ...base, sourceId: "call-2", file: "b.md" });
    const focused = focusProposal(s1, proposalKey({ sourceId: "call-2", file: "b.md" }));
    expect(focused.queue[0].file).toBe("b.md");
    const resolved = resolveProposal(s1, proposalKey(base));
    expect(resolved.queue.map((p) => p.file)).toEqual(["b.md"]);
    expect(enqueueProposal(resolved, base).queue).toHaveLength(1);
  });
});

describe("workbench-publish-store", () => {
  const step = (target: PublishStepOutput["target"], status: PublishStepOutput["status"]): PublishStepOutput => ({ target, status, detail: null, url: null, error: null });
  const empty: PublishState = { workspaceId: "ws", runs: {}, order: [], panel: null };

  it("thử lại một đích: dòng đó theo run thử lại, bảng còn chạy tới khi run thử lại xong", () => {
    let s = upsertRun(empty, { runId: "r1", file: "a.md", steps: [step("LOCAL", "DONE"), step("GIT", "ERROR"), step("NOTEBOOK", "DONE")], finished: true });
    s = { ...s, panel: { file: "a.md", baseRunId: "r1", overlays: { GIT: "r2" }, collapsed: false } };
    expect(panelRunning(s)).toBe(true);
    s = upsertRun(s, { runId: "r2", file: "a.md", steps: [step("LOCAL", "DONE"), step("GIT", "DONE")], finished: true });
    expect(panelSteps(s).map((x) => x.status)).toEqual(["DONE", "DONE", "DONE"]);
    expect(panelRunning(s)).toBe(false);
    expect(summarizeSteps(panelSteps(s), false)).toMatchObject({ total: 3, done: 3, errors: 0 });
  });

  it("khôi phục: mở bảng cho run chưa xong mới nhất, không ghi đè run đã có từ SSE", () => {
    const run = (runId: string, createdAt: string, finished: boolean): PublishRun => ({
      runId,
      workspaceId: "ws",
      file: `${runId}.md`,
      steps: [step("LOCAL", finished ? "DONE" : "RUNNING")],
      finished,
      createdAt,
      finishedAt: null,
    });
    const fromSse = upsertRun(empty, { runId: "r2", file: "r2.md", steps: [step("LOCAL", "DONE")], finished: true });
    const s = seedRunList(fromSse, [run("r1", at, false), run("r2", "2026-10-08T00:00:01.000Z", false)]);
    expect(s.runs.r2.finished).toBe(true);
    expect(s.panel?.baseRunId).toBe("r2");
  });

  it("response forceSync đến sau SSE không ghi đè tiến trình mới hơn", () => {
    const store = usePublishStore.getState();
    store.reset("ws-race");
    store.applyProgress({ workspaceId: "ws-race", runId: "r9", file: "a.md", steps: [step("LOCAL", "DONE")], finished: true });
    usePublishStore.getState().ensureRun({ runId: "r9", file: "a.md", steps: [step("LOCAL", "PENDING")], finished: false });
    expect(usePublishStore.getState().runs.r9.finished).toBe(true);
  });

  it("chip Header bỏ LOCAL / SKIPPED, lấy trạng thái mới nhất", () => {
    let s = upsertRun(empty, { runId: "r1", file: "a.md", steps: [step("LOCAL", "DONE"), step("GIT", "ERROR"), step("DRIVE", "SKIPPED")], finished: true });
    s = upsertRun(s, { runId: "r2", file: "b.md", steps: [step("LOCAL", "DONE"), step("GIT", "RUNNING")], finished: false });
    const chips = headerSteps(s);
    expect(Object.keys(chips)).toEqual(["GIT"]);
    expect(chips.GIT?.status).toBe("RUNNING");
  });
});

describe("workbench-cli-store", () => {
  const ev = (seq: number, e: Record<string, unknown>) => ({ runId: "run", seq, at, ...e }) as CliRunEvent;

  it("bỏ qua seq đã có khi server phát lại, STATUS cập nhật trạng thái", () => {
    let run = newCliRun({ runId: "run", workspaceId: "ws", sessionId: "s1", prompt: "p", profileId: "claude-code" });
    const events = [ev(0, { type: "LOG", stream: "STDOUT", text: "a" }), ev(1, { type: "STATUS", status: "DONE", exitCode: 0, error: null })];
    for (const e of [...events, ...events]) run = applyCliEvent(run, e);
    expect(run.events).toHaveLength(2);
    expect(run.status).toBe("DONE");
    expect(run.exitCode).toBe(0);
  });

  it("dòng thời gian gộp LOG liền nhau và MESSAGE delta", () => {
    const items = buildCliTimeline([
      ev(0, { type: "LOG", stream: "STDOUT", text: "a" }),
      ev(1, { type: "LOG", stream: "STDERR", text: "b" }),
      ev(2, { type: "MESSAGE", text: "Xin ", delta: true }),
      ev(3, { type: "MESSAGE", text: "chào", delta: true }),
      ev(4, { type: "TOOL_CALL", name: "Edit", input: "a.md" }),
      ev(5, { type: "MESSAGE", text: "Xong", delta: false }),
      ev(6, { type: "PROPOSAL", file: "a.md", isNewFile: false }),
    ]);
    expect(items.map((i) => i.kind)).toEqual(["log", "message", "tool", "message", "proposal"]);
    expect(items[0]).toMatchObject({ text: "a\nb", streams: ["STDOUT", "STDERR"] });
    expect(items[1]).toMatchObject({ text: "Xin chào" });
  });
});

describe("withActiveSession", () => {
  it("đặt / bỏ phiên đang mở theo workspace, không đụng workspace khác", () => {
    const a = withActiveSession({ active: {} }, "ws1", "s1");
    const b = withActiveSession(a, "ws2", "s2");
    expect(b.active).toEqual({ ws1: "s1", ws2: "s2" });
    const c = withActiveSession(b, "ws1", null);
    expect(c.active).toEqual({ ws2: "s2" });
    expect(b.active).toEqual({ ws1: "s1", ws2: "s2" });
  });
});
