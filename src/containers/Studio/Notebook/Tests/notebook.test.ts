import { describe, expect, it } from "vitest";
import { NotebookLmClient, NotebookLmError, extractRpcResult, normalizeCookie, parseBatchResponse, RPC } from "@/ship/adapters/notebooklm";
import type { NotebookClientFactory } from "../Models/notebookCredentials";
import { CheckNotebookTask } from "../Tasks/CheckNotebookTask";
import { RefreshNotebookDriveSourceTask } from "../Tasks/RefreshNotebookDriveSourceTask";
import { ReplaceNotebookTextSourceTask } from "../Tasks/ReplaceNotebookTextSourceTask";

const COOKIE = "SID=a; HSID=b; SSID=c; APISID=d; SAPISID=e; __Secure-1PSID=f";
const HOME_HTML = `<script>WIZ_global_data = {"SNlM0e":"AT_TOKEN","cfb2h":"boq_bl_1","FdrFJe":"-123"}</script>`;

/** Một response batchexecute với payload cho `rpcId` (hoặc lỗi mã `errorCode`). */
function batch(rpcId: string, payload: unknown, errorCode?: number): string {
  const item = errorCode === undefined ? ["wrb.fr", rpcId, JSON.stringify(payload), null, null, null, "generic"] : ["wrb.fr", rpcId, null, null, null, [errorCode], "generic"];
  const line = JSON.stringify([item, ["di", 42]]);
  return `)]}'\n\n${line.length}\n${line}\n25\n[["e",4,null,null,123]]\n`;
}

type Call = { url: string; rpcId: string | null; params: unknown; body: string | null };

/** fetch giả: trang chủ trả HTML có token; batchexecute trả theo rpc id. */
function fakeFetch(handlers: Record<string, (params: unknown) => string | Response>, homeUrl = "https://notebooklm.google.com/") {
  const calls: Call[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes("batchexecute")) {
      const res = new Response(HOME_HTML, { status: 200 });
      Object.defineProperty(res, "url", { value: homeUrl });
      return res;
    }
    const rpcId = new URL(url).searchParams.get("rpcids");
    const body = String(init?.body ?? "");
    const fReq = JSON.parse(decodeURIComponent(/f\.req=([^&]*)/.exec(body)![1])) as [[[string, string]]];
    const params = JSON.parse(fReq[0][0][1]) as unknown;
    calls.push({ url, rpcId, params, body });
    const out = handlers[rpcId ?? ""]?.(params) ?? batch(rpcId ?? "", []);
    return typeof out === "string" ? new Response(out, { status: 200 }) : out;
  }) as typeof fetch;
  return { calls, fn };
}

/** `cookie = null` = chưa cấu hình cookie. */
const client = (fn: typeof fetch, cookie: string | null = COOKIE) => new NotebookLmClient(async () => cookie ?? undefined, fn);
const factory = (c: NotebookLmClient): NotebookClientFactory => () => c;

/** Notebook có các source: [[id], title, metadata(type ở [4], drive doc id ở [0][0])]. */
const notebook = (sources: [string, string, number, string?][]) => [
  ["My NB", sources.map(([id, title, type, doc]) => [[id], title, [doc ? [doc] : null, null, null, null, type]]), "nb", "📘"],
];

describe("adapter NotebookLM (batchexecute)", () => {
  it("parse response: bỏ )]}', đọc chunk, lấy payload theo rpc id; lỗi mã 16 → AUTH", () => {
    expect(extractRpcResult(parseBatchResponse(batch("abc", { x: 1 })), "abc")).toEqual({ x: 1 });
    expect(extractRpcResult(parseBatchResponse(batch("abc", [])), "other")).toBeNull();
    expect(() => extractRpcResult(parseBatchResponse(batch("abc", null, 16)), "abc")).toThrow(NotebookLmError);
  });

  it("cookie: bỏ tiền tố 'Cookie:', thiếu cookie bắt buộc → AUTH", () => {
    expect(normalizeCookie(`Cookie: ${COOKIE}\n`)).toBe(COOKIE);
    expect(() => normalizeCookie("SID=a; HSID=b")).toThrow(expect.objectContaining({ kind: "AUTH", detail: expect.stringContaining("APISID") }));
  });

  it("gửi f.req + at (SNlM0e), bl/f.sid lấy từ trang chủ, source-path theo notebook", async () => {
    const { calls, fn } = fakeFetch({ [RPC.GET_NOTEBOOK]: () => batch(RPC.GET_NOTEBOOK, notebook([["s1", "a.md", 4]])) });
    const nb = await client(fn).getNotebook("nb");
    expect(nb).toMatchObject({ id: "nb", title: "My NB", sourceCount: 1, sources: [{ id: "s1", title: "a.md", type: "pasted_text", driveDocId: null }] });
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe("/_/LabsTailwindUi/data/batchexecute");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ rpcids: "rLM1Ne", "source-path": "/notebook/nb", bl: "boq_bl_1", "f.sid": "-123", rt: "c" });
    expect(calls[0].body).toContain("at=AT_TOKEN");
    expect(calls[0].params).toEqual(["nb", null, [2], null, 0]);
  });

  it("chưa có cookie → NO_CREDENTIALS; trang chủ chuyển sang accounts.google.com → AUTH", async () => {
    await expect(client(fakeFetch({}).fn, null).listNotebooks()).rejects.toMatchObject({ kind: "NO_CREDENTIALS" });
    const expired = fakeFetch({}, "https://accounts.google.com/ServiceLogin");
    await expect(client(expired.fn, "SID=1; HSID=1; SSID=1; APISID=1; SAPISID=2").listNotebooks()).rejects.toMatchObject({ kind: "AUTH" });
  });
});

describe("task Notebook (client giả qua fetch)", () => {
  it("RPC: thêm source văn bản mới rồi xoá mọi source cũ cùng tên", async () => {
    const { calls, fn } = fakeFetch({
      [RPC.GET_NOTEBOOK]: () => batch(RPC.GET_NOTEBOOK, notebook([["s1", "a.md", 4], ["s2", "b.md", 4], ["s3", "a.md", 4]])),
      [RPC.ADD_SOURCE]: () => batch(RPC.ADD_SOURCE, [[[["new1"], "a.md"]]]),
    });
    const out = await new ReplaceNotebookTextSourceTask(factory(client(fn))).run({ workspaceId: "w", notebookId: "nb", title: "a.md", content: "# A" });
    expect(out).toEqual({ sourceId: "new1", replaced: 2 });
    const add = calls.find((c) => c.rpcId === RPC.ADD_SOURCE)!;
    expect(add.params).toEqual([[[null, ["a.md", "# A"], null, 2, null, null, null, null, null, null, 1]], "nb", [2], [1, null, null, null, null, null, null, null, null, null, [1]]]);
    expect(calls.find((c) => c.rpcId === RPC.DELETE_SOURCES)!.params).toEqual([[["s1"], ["s3"]], [2]]);
  });

  it("DRIVE_SYNC: source Drive của Doc đã có → sync (giữ id); chưa có → thêm Google Doc, bỏ source văn bản cùng tên", async () => {
    const existing = fakeFetch({ [RPC.GET_NOTEBOOK]: () => batch(RPC.GET_NOTEBOOK, notebook([["d1", "a.md", 1, "doc"]])) });
    expect(await new RefreshNotebookDriveSourceTask(factory(client(existing.fn))).run({ workspaceId: "w", notebookId: "nb", documentId: "doc", title: "a.md" })).toEqual({
      sourceId: "d1",
      added: false,
    });
    expect(existing.calls.find((c) => c.rpcId === RPC.SYNC_DRIVE_SOURCE)!.params).toEqual([null, ["d1"], [2]]);

    const fresh = fakeFetch({
      [RPC.GET_NOTEBOOK]: () => batch(RPC.GET_NOTEBOOK, notebook([["s1", "a.md", 4]])),
      [RPC.ADD_SOURCE]: () => batch(RPC.ADD_SOURCE, [[[["d9"], "a.md"]]]),
    });
    expect(await new RefreshNotebookDriveSourceTask(factory(client(fresh.fn))).run({ workspaceId: "w", notebookId: "nb", documentId: "doc", title: "a.md" })).toEqual({
      sourceId: "d9",
      added: true,
    });
    const add = fresh.calls.find((c) => c.rpcId === RPC.ADD_SOURCE)!.params as unknown[][];
    expect((add[0] as unknown[][])[0][0]).toEqual(["doc", "application/vnd.google-apps.document", 1, "a.md"]);
    expect(fresh.calls.find((c) => c.rpcId === RPC.DELETE_SOURCES)!.params).toEqual([[["s1"]], [2]]);
  });

  it("Check: ok / notebook không có → ok=false; chưa có cookie, hết hạn → mã NOTEBOOK.*", async () => {
    const noDrive = async () => Promise.reject(new Error("không dùng"));
    const input = { notebookId: "nb", syncStrategy: "RPC" as const, workspaceId: "w" };
    const found = fakeFetch({ [RPC.GET_NOTEBOOK]: () => batch(RPC.GET_NOTEBOOK, notebook([["s1", "a.md", 4]])) });
    expect(await new CheckNotebookTask(factory(client(found.fn)), noDrive).run(input)).toEqual({ ok: true, sourceCount: 1, title: "My NB" });
    const missing = fakeFetch({ [RPC.GET_NOTEBOOK]: () => batch(RPC.GET_NOTEBOOK, null, 5) });
    expect(await new CheckNotebookTask(factory(client(missing.fn)), noDrive).run(input)).toEqual({ ok: false, sourceCount: null, title: null });
    await expect(new CheckNotebookTask(factory(client(found.fn, null)), noDrive).run(input)).rejects.toMatchObject({ code: "NOTEBOOK.CREDENTIALS_MISSING" });
    const expired = fakeFetch({ [RPC.GET_NOTEBOOK]: () => new Response("", { status: 401 }) });
    await expect(new CheckNotebookTask(factory(client(expired.fn, "SID=9; HSID=9; SSID=9; APISID=9; SAPISID=9")), noDrive).run(input)).rejects.toMatchObject({
      code: "NOTEBOOK.AUTH_REQUIRED",
    });
  });
});
