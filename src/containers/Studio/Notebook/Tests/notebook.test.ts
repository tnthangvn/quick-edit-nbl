import { describe, expect, it } from "vitest";
import { NlmClient, type NlmRunner } from "@/ship/adapters/nlm";
import type { RunResult } from "@/ship/adapters/process";
import { CheckNotebookTask } from "../Tasks/CheckNotebookTask";
import { RefreshNotebookDriveSourceTask } from "../Tasks/RefreshNotebookDriveSourceTask";
import { ReplaceNotebookTextSourceTask } from "../Tasks/ReplaceNotebookTextSourceTask";

const ok = (stdout: unknown): RunResult => ({ exitCode: 0, stdout: typeof stdout === "string" ? stdout : JSON.stringify(stdout), stderr: "", timedOut: false });
const fail = (error: string): RunResult => ({ exitCode: 1, stdout: JSON.stringify({ status: "error", error }), stderr: "", timedOut: false });

/** Runner nlm giả: ghi lại lệnh, trả kết quả theo "nhóm lệnh" (vd "source list"). */
function fakeNlm(responses: Record<string, RunResult>) {
  const calls: string[][] = [];
  const runner: NlmRunner = async (args) => {
    calls.push([...args]);
    return responses[args.slice(0, 2).join(" ")] ?? ok({});
  };
  return { calls, client: new NlmClient(runner) };
}

const SOURCES = [
  { id: "s1", title: "a.md", type: "generated_text" },
  { id: "s2", title: "b.md", type: "generated_text" },
  { id: "s3", title: "a.md", type: "generated_text" },
];

describe("Notebook qua CLI nlm (runner giả)", () => {
  it("RPC: thêm source văn bản mới rồi xoá mọi source cũ cùng tên", async () => {
    const { calls, client } = fakeNlm({ "source list": ok(SOURCES), "source add": ok({ source_id: "new1", title: "a.md" }) });
    const out = await new ReplaceNotebookTextSourceTask(client).run({ notebookId: "nb", title: "a.md", content: "# A" });
    expect(out).toEqual({ sourceId: "new1", replaced: 2 });
    expect(calls).toEqual([
      ["source", "list", "nb", "--json"],
      ["source", "add", "nb", "--text", "# A", "--title", "a.md", "--wait", "--json"],
      ["source", "delete", "s1", "s3", "--confirm", "--json"],
    ]);
  });

  it("RPC: nội dung lớn đi qua file tạm thay vì argv", async () => {
    const { calls, client } = fakeNlm({ "source list": ok([]), "source add": ok({ source_id: "n" }) });
    await new ReplaceNotebookTextSourceTask(client).run({ notebookId: "nb", title: "big.md", content: "x".repeat(150_000) });
    expect(calls[1]).toContain("--file");
    expect(calls[1]).not.toContain("--text");
  });

  it("DRIVE_SYNC: source Drive đã có → sync; chưa có → thêm Google Doc và bỏ source văn bản cùng tên", async () => {
    const existing = fakeNlm({ "source list": ok([{ id: "d1", title: "a.md", type: "google_docs" }]) });
    expect(await new RefreshNotebookDriveSourceTask(existing.client).run({ notebookId: "nb", documentId: "doc", title: "a.md" })).toEqual({
      sourceId: "d1",
      added: false,
    });
    expect(existing.calls[1]).toEqual(["source", "sync", "nb", "--source-ids", "d1", "--confirm"]);

    const fresh = fakeNlm({ "source list": ok(SOURCES), "source add": ok({ source_id: "d9" }) });
    expect(await new RefreshNotebookDriveSourceTask(fresh.client).run({ notebookId: "nb", documentId: "doc", title: "a.md" })).toEqual({
      sourceId: "d9",
      added: true,
    });
    expect(fresh.calls[1]).toEqual(["source", "add", "nb", "--drive", "doc", "--title", "a.md", "--wait", "--json"]);
    expect(fresh.calls[2]).toEqual(["source", "delete", "s1", "s3", "--confirm", "--json"]);
  });

  it("Check: ok / notebook không có → ok=false; lỗi đăng nhập, thiếu CLI, lỗi khác → mã NOTEBOOK.*", async () => {
    const noDrive = async () => Promise.reject(new Error("không dùng"));
    const found = fakeNlm({ "notebook get": ok({ notebook_id: "nb", title: "T", source_count: 4 }) });
    expect(await new CheckNotebookTask(found.client, noDrive).run({ notebookId: "nb", syncStrategy: "RPC", workspaceId: "w" })).toEqual({
      ok: true,
      sourceCount: 4,
      title: "T",
    });
    const input = { notebookId: "nb", syncStrategy: "RPC" as const, workspaceId: "w" };
    const missing = fakeNlm({ "notebook get": fail("API error (code 5): NOT_FOUND") });
    expect(await new CheckNotebookTask(missing.client, noDrive).run(input)).toEqual({ ok: false, sourceCount: null, title: null });
    const auth = fakeNlm({ "notebook get": fail("Authentication expired. Run nlm login") });
    await expect(new CheckNotebookTask(auth.client, noDrive).run(input)).rejects.toMatchObject({ code: "NOTEBOOK.AUTH_REQUIRED" });
    const notInstalled = new NlmClient(async () => ({ exitCode: -1, stdout: "", stderr: "", timedOut: false }));
    await expect(new CheckNotebookTask(notInstalled, noDrive).run(input)).rejects.toMatchObject({ code: "NOTEBOOK.CLI_NOT_FOUND" });
    const broken = fakeNlm({ "notebook get": fail("boom") });
    await expect(new CheckNotebookTask(broken.client, noDrive).run(input)).rejects.toMatchObject({ code: "NOTEBOOK.COMMAND_FAILED", params: { detail: "boom" } });
  });
});
