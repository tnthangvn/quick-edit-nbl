import "server-only";
import { createHash } from "node:crypto";

/**
 * Client NotebookLM gọi thẳng API nội bộ của web app (`/_/LabsTailwindUi/data/batchexecute`) bằng cookie đăng nhập Google
 * của người dùng — cùng cơ chế với giao diện web / extension, không qua CLI bên thứ 3.
 * Giao thức (rpc id, tham số, cách parse) tham khảo từ notebooklm-mcp-cli 0.9.11 (MIT, © 2025 Jacob Ben-David,
 * https://github.com/jacob-bd/gemini-notebook-mcp-cli). Đây là API không công khai: Google đổi thì phải cập nhật rpc id ở RPC.
 *
 * Xác thực: chuỗi header `Cookie` (cần SID, HSID, SSID, APISID, SAPISID) lấy từ secret store; token CSRF `at` (SNlM0e),
 * `bl`, `f.sid` đọc từ HTML trang chủ NotebookLM và cache theo cookie. Hết hạn → làm mới token một lần rồi mới báo AUTH.
 * Cookie không bao giờ được log hay trả ra API.
 */

const BASE_URL = "https://notebooklm.google.com";
const BATCH_PATH = "/_/LabsTailwindUi/data/batchexecute";
const BL_FALLBACK = "boq_labs-tailwind-frontend_20260108.06_p0";
const REQUIRED_COOKIES = ["SID", "HSID", "SSID", "APISID", "SAPISID"] as const;
const DEFAULT_TIMEOUT_MS = 30_000;
const ADD_SOURCE_TIMEOUT_MS = 120_000;
const PAGE_TIMEOUT_MS = 15_000;
const TOKEN_TTL_MS = 6 * 60 * 60_000;
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** rpc id của các thao tác dùng tới. */
export const RPC = {
  LIST_NOTEBOOKS: "wXbhsf",
  GET_NOTEBOOK: "rLM1Ne",
  ADD_SOURCE: "izAoDd",
  SYNC_DRIVE_SOURCE: "FLmJqe",
  DELETE_SOURCES: "tGMBJ",
} as const;

/** Mã loại source của NotebookLM. */
const SOURCE_TYPE: Record<number, string> = { 1: "google_docs", 2: "google_slides_sheets", 3: "pdf", 4: "pasted_text", 5: "web_page", 9: "youtube", 11: "file" };
export const NOTEBOOK_DRIVE_DOC_TYPE = "google_docs";
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

export const NOTEBOOK_URL = (notebookId: string) => `${BASE_URL}/notebook/${encodeURIComponent(notebookId)}`;

/** NO_CREDENTIALS: chưa dán cookie; AUTH: cookie hết hạn / sai; NOT_FOUND: notebook/source không có hoặc không có quyền. */
export type NotebookLmErrorKind = "NO_CREDENTIALS" | "AUTH" | "NOT_FOUND" | "FAILED";

export class NotebookLmError extends Error {
  constructor(
    readonly kind: NotebookLmErrorKind,
    readonly detail = "",
  ) {
    super(`notebooklm ${kind}`);
  }
}

export type NotebookSource = { id: string; title: string; type: string | null; driveDocId: string | null };
export type NotebookInfo = { id: string; title: string; sourceCount: number; url: string };

/** Trả chuỗi Cookie (hoặc undefined nếu chưa cấu hình). */
export type CookieProvider = () => Promise<string | undefined>;

type Tokens = { at: string; bl: string; fsid: string | null; fetchedAt: number };
const globalForTokens = globalThis as unknown as { __specStudioNlmTokens?: Map<string, Tokens> };
const tokenCache = (globalForTokens.__specStudioNlmTokens ??= new Map());

/** Chuẩn hoá chuỗi cookie dán vào (bỏ tiền tố "Cookie:", xuống dòng) và kiểm tra đủ cookie bắt buộc. */
export function normalizeCookie(raw: string): string {
  const cookie = raw
    .replace(/^\s*cookie\s*:\s*/i, "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  const names = new Set(cookie.split(";").map((p) => p.split("=")[0]?.trim()));
  const missing = REQUIRED_COOKIES.filter((n) => !names.has(n));
  if (missing.length > 0) throw new NotebookLmError("AUTH", `thiếu cookie: ${missing.join(", ")}`);
  return cookie;
}

/** Bỏ tiền tố `)]}'`, đọc từng dòng JSON (dòng số = độ dài chunk), trả mọi mảng. */
export function parseBatchResponse(text: string): unknown[] {
  const body = text.replace(/^\)\]\}'\s*/, "");
  const chunks: unknown[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /^\d+$/.test(trimmed)) continue;
    try {
      const v = JSON.parse(trimmed) as unknown;
      if (Array.isArray(v)) chunks.push(v);
    } catch {
      // Dòng không phải JSON hoàn chỉnh: bỏ qua.
    }
  }
  return chunks;
}

const ERROR_KIND: Record<number, NotebookLmErrorKind> = { 16: "AUTH", 5: "NOT_FOUND", 7: "NOT_FOUND" };

/** Payload của rpc trong response; lỗi rpc (item[5] = [code, ...]) → NotebookLmError. */
export function extractRpcResult(chunks: unknown[], rpcId: string): unknown {
  for (const chunk of chunks) {
    if (!Array.isArray(chunk)) continue;
    for (const item of chunk) {
      if (!Array.isArray(item) || item[0] !== "wrb.fr" || item[1] !== rpcId) continue;
      const err = item[5];
      if (Array.isArray(err) && typeof err[0] === "number") {
        throw new NotebookLmError(ERROR_KIND[err[0]] ?? "FAILED", `rpc ${rpcId} lỗi mã ${err[0]}`);
      }
      return typeof item[2] === "string" ? (JSON.parse(item[2]) as unknown) : (item[2] ?? null);
    }
  }
  return null;
}

const at = (v: unknown, ...path: number[]): unknown => path.reduce<unknown>((cur, i) => (Array.isArray(cur) ? cur[i] : undefined), v);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function parseSource(src: unknown): NotebookSource | null {
  const id = str(at(src, 0, 0));
  if (!id) return null;
  const typeCode = at(src, 2, 4);
  return {
    id,
    title: str(at(src, 1)) ?? "",
    type: typeof typeCode === "number" ? (SOURCE_TYPE[typeCode] ?? `type_${typeCode}`) : null,
    driveDocId: str(at(src, 2, 0, 0)),
  };
}

export class NotebookLmClient {
  constructor(
    private readonly cookies: CookieProvider,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async listNotebooks(): Promise<NotebookInfo[]> {
    const result = await this.call(RPC.LIST_NOTEBOOKS, [null, 1, null, [2]], "/");
    const list = at(result, 0);
    return (Array.isArray(list) ? list : []).flatMap((nb): NotebookInfo[] => {
      const id = str(at(nb, 2));
      if (!id) return [];
      const sources = at(nb, 1);
      return [{ id, title: str(at(nb, 0)) ?? "", sourceCount: Array.isArray(sources) ? sources.length : 0, url: NOTEBOOK_URL(id) }];
    });
  }

  async getNotebook(notebookId: string): Promise<NotebookInfo & { sources: NotebookSource[] }> {
    const result = await this.call(RPC.GET_NOTEBOOK, [notebookId, null, [2], null, 0], `/notebook/${notebookId}`);
    const nb = at(result, 0);
    if (!Array.isArray(nb)) throw new NotebookLmError("NOT_FOUND", "notebook không có hoặc không có quyền");
    const raw = at(nb, 1);
    const sources = (Array.isArray(raw) ? raw : []).map(parseSource).filter((s): s is NotebookSource => s !== null);
    return { id: str(at(nb, 2)) ?? notebookId, title: str(at(nb, 0)) ?? "", sourceCount: sources.length, url: NOTEBOOK_URL(notebookId), sources };
  }

  async listSources(notebookId: string): Promise<NotebookSource[]> {
    return (await this.getNotebook(notebookId)).sources;
  }

  async deleteSources(sourceIds: readonly string[]): Promise<void> {
    if (sourceIds.length === 0) return;
    await this.call(RPC.DELETE_SOURCES, [sourceIds.map((id) => [id]), [2]], "/");
  }

  async addTextSource(notebookId: string, title: string, text: string): Promise<string> {
    const source = [null, [title, text], null, 2, null, null, null, null, null, null, 1];
    return this.addSource(notebookId, source, (s) => s.title === title);
  }

  async addDriveSource(notebookId: string, documentId: string, title: string): Promise<string> {
    const source = [[documentId, GOOGLE_DOC_MIME, 1, title], null, null, null, null, null, null, null, null, null, 1];
    return this.addSource(notebookId, source, (s) => s.driveDocId === documentId);
  }

  /** "Sync with Google Drive" của từng source (mỗi lần một id). */
  async syncDriveSources(_notebookId: string, sourceIds: readonly string[]): Promise<void> {
    for (const id of sourceIds) await this.call(RPC.SYNC_DRIVE_SOURCE, [null, [id], [2]], "/");
  }

  /** Thêm source; lỗi mã 3 / 9 có thể vẫn đã thêm → đọc lại danh sách tìm source vừa thêm. */
  private async addSource(notebookId: string, source: unknown[], match: (s: NotebookSource) => boolean): Promise<string> {
    const params = [[source], notebookId, [2], [1, null, null, null, null, null, null, null, null, null, [1]]];
    const before = new Set((await this.listSources(notebookId)).filter(match).map((s) => s.id));
    let result: unknown;
    try {
      result = await this.call(RPC.ADD_SOURCE, params, `/notebook/${notebookId}`, ADD_SOURCE_TIMEOUT_MS);
    } catch (err) {
      if (!(err instanceof NotebookLmError) || err.kind !== "FAILED") throw err;
    }
    const id = str(at(result, 0, 0, 0, 0));
    if (id) return id;
    const added = (await this.listSources(notebookId)).find((s) => match(s) && !before.has(s.id));
    if (!added) throw new NotebookLmError("FAILED", "không thêm được source");
    return added.id;
  }

  // ---------- transport ----------

  private async call(rpcId: string, params: unknown, sourcePath: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
    const cookie = await this.cookie();
    try {
      return await this.post(cookie, await this.tokens(cookie), rpcId, params, sourcePath, timeoutMs);
    } catch (err) {
      if (!(err instanceof NotebookLmError) || err.kind !== "AUTH") throw err;
      // Token CSRF có thể đã cũ: lấy lại một lần rồi thử lại.
      tokenCache.delete(cacheKey(cookie));
      return this.post(cookie, await this.tokens(cookie), rpcId, params, sourcePath, timeoutMs);
    }
  }

  private async cookie(): Promise<string> {
    const raw = await this.cookies();
    if (!raw?.trim()) throw new NotebookLmError("NO_CREDENTIALS");
    return normalizeCookie(raw);
  }

  private async tokens(cookie: string): Promise<Tokens> {
    const key = cacheKey(cookie);
    const cached = tokenCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < TOKEN_TTL_MS) return cached;
    const res = await this.fetchFn(`${BASE_URL}/`, {
      headers: {
        Cookie: cookie,
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (res.url.includes("accounts.google.com")) throw new NotebookLmError("AUTH", "cookie hết hạn (chuyển tới trang đăng nhập)");
    if (!res.ok) throw new NotebookLmError(res.status === 401 || res.status === 403 ? "AUTH" : "FAILED", `HTTP ${res.status}`);
    const html = await res.text();
    const atToken = /"SNlM0e":"([^"]+)"/.exec(html)?.[1];
    if (!atToken) throw new NotebookLmError("AUTH", "không đọc được token phiên (SNlM0e)");
    const tokens: Tokens = {
      at: atToken,
      bl: /"cfb2h":"([^"]+)"/.exec(html)?.[1] ?? BL_FALLBACK,
      fsid: /"FdrFJe":"([^"]+)"/.exec(html)?.[1] ?? null,
      fetchedAt: Date.now(),
    };
    tokenCache.set(key, tokens);
    return tokens;
  }

  private async post(cookie: string, tokens: Tokens, rpcId: string, params: unknown, sourcePath: string, timeoutMs: number): Promise<unknown> {
    const query = new URLSearchParams({ rpcids: rpcId, "source-path": sourcePath, bl: tokens.bl, hl: "en", rt: "c" });
    if (tokens.fsid) query.set("f.sid", tokens.fsid);
    const fReq = JSON.stringify([[[rpcId, JSON.stringify(params), null, "generic"]]]);
    const res = await this.fetchFn(`${BASE_URL}${BATCH_PATH}?${query}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Origin: BASE_URL,
        Referer: `${BASE_URL}/`,
        "X-Same-Domain": "1",
        "User-Agent": UA,
      },
      body: `f.req=${encodeURIComponent(fReq)}&at=${encodeURIComponent(tokens.at)}&`,
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((err: unknown) => {
      throw new NotebookLmError("FAILED", err instanceof Error ? err.message : "network");
    });
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new NotebookLmError("AUTH", `HTTP ${res.status}`);
    if (!res.ok) throw new NotebookLmError("FAILED", `HTTP ${res.status}`);
    return extractRpcResult(parseBatchResponse(await res.text()), rpcId);
  }
}

const cacheKey = (cookie: string) => createHash("sha256").update(cookie).digest("hex");
