import "server-only";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { run, type RunResult } from "@/ship/adapters/process";

/**
 * NotebookLM không có API công khai: đi qua CLI `nlm` (gói notebooklm-mcp-cli, đăng nhập sẵn bằng `nlm login`).
 * Mọi lệnh chạy không qua shell, luôn có `--json` để parse. Lỗi được phân loại thành NlmError.kind;
 * container tự đổi sang mã lỗi nghiệp vụ.
 */
export type NlmRunner = (args: readonly string[], opts?: { timeout?: number }) => Promise<RunResult>;

export const runNlm: NlmRunner = (args, opts = {}) => run("nlm", args, { timeout: opts.timeout ?? 120_000, env: { NO_COLOR: "1" } });

export type NlmErrorKind = "NOT_INSTALLED" | "AUTH" | "NOT_FOUND" | "FAILED";

export class NlmError extends Error {
  constructor(
    readonly kind: NlmErrorKind,
    readonly detail: string,
  ) {
    super(`nlm ${kind}`);
  }
}

export type NlmSource = { id: string; title: string; type: string | null };
export type NlmNotebook = { id: string; title: string; sourceCount: number; url: string | null };

/** Nội dung lớn hơn ngưỡng này gửi bằng file tạm thay vì tham số dòng lệnh (giới hạn một argv ~128KB). */
const INLINE_TEXT_LIMIT = 100_000;

function classify(r: RunResult): NlmErrorKind {
  const s = `${r.stdout}\n${r.stderr}`;
  if (/authenticat|login|cookie|expired|unauthori[sz]ed|\b401\b/i.test(s)) return "AUTH";
  if (/not[_ ]found|code 5\b|\b404\b|permission denied|code 7\b/i.test(s)) return "NOT_FOUND";
  return "FAILED";
}

function detailOf(r: RunResult): string {
  try {
    const parsed = JSON.parse(r.stdout) as { error?: string };
    if (parsed.error) return String(parsed.error).slice(0, 600);
  } catch {
    /* stdout không phải JSON */
  }
  return (r.stderr || r.stdout).trim().slice(0, 600);
}

export class NlmClient {
  constructor(private readonly runner: NlmRunner = runNlm) {}

  private async exec(args: readonly string[], timeout?: number): Promise<string> {
    const r = await this.runner(args, { timeout });
    // reject=false: thiếu binary không ném mà trả exitCode -1 (không spawn được).
    if (r.exitCode === -1 && !r.timedOut) throw new NlmError("NOT_INSTALLED", "nlm");
    if (r.exitCode !== 0 || r.timedOut) throw new NlmError(r.timedOut ? "FAILED" : classify(r), r.timedOut ? "timeout" : detailOf(r));
    return r.stdout;
  }

  private async json<T>(args: readonly string[], timeout?: number): Promise<T> {
    const out = await this.exec([...args, "--json"], timeout);
    try {
      return JSON.parse(out) as T;
    } catch {
      throw new NlmError("FAILED", out.slice(0, 600));
    }
  }

  async getNotebook(notebookId: string): Promise<NlmNotebook> {
    const nb = await this.json<{ notebook_id?: string; title?: string; source_count?: number; url?: string; sources?: unknown[] }>([
      "notebook",
      "get",
      notebookId,
    ]);
    return {
      id: nb.notebook_id ?? notebookId,
      title: nb.title ?? "",
      sourceCount: nb.source_count ?? nb.sources?.length ?? 0,
      url: nb.url ?? null,
    };
  }

  async listSources(notebookId: string): Promise<NlmSource[]> {
    const list = await this.json<{ id: string; title: string; type?: string | null }[]>(["source", "list", notebookId]);
    return list.map((s) => ({ id: s.id, title: s.title, type: s.type ?? null }));
  }

  async deleteSources(sourceIds: readonly string[]): Promise<void> {
    if (sourceIds.length === 0) return;
    await this.json(["source", "delete", ...sourceIds, "--confirm"]);
  }

  /** Thêm source dạng văn bản (chiến lược RPC). Trả id source mới. */
  async addTextSource(notebookId: string, title: string, text: string): Promise<string> {
    if (Buffer.byteLength(text, "utf8") <= INLINE_TEXT_LIMIT) {
      const r = await this.json<{ source_id?: string }>(["source", "add", notebookId, "--text", text, "--title", title, "--wait"], 300_000);
      return r.source_id ?? "";
    }
    const dir = await mkdtemp(path.join(os.tmpdir(), "spec-studio-nlm-"));
    try {
      const file = path.join(dir, path.basename(title).replace(/[^\p{L}\p{N}._ -]/gu, "_") || "spec.md");
      await writeFile(file, text, "utf8");
      const r = await this.json<{ source_id?: string }>(["source", "add", notebookId, "--file", file, "--title", title, "--wait"], 300_000);
      return r.source_id ?? "";
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  /** Thêm Google Doc trên Drive làm source (chiến lược DRIVE_SYNC). */
  async addDriveSource(notebookId: string, documentId: string, title: string): Promise<string> {
    const r = await this.json<{ source_id?: string }>(["source", "add", notebookId, "--drive", documentId, "--title", title, "--wait"], 300_000);
    return r.source_id ?? "";
  }

  /** Kéo nội dung mới nhất của source Drive vào notebook. */
  async syncDriveSources(notebookId: string, sourceIds: readonly string[]): Promise<void> {
    if (sourceIds.length === 0) return;
    await this.exec(["source", "sync", notebookId, "--source-ids", sourceIds.join(","), "--confirm"], 300_000);
  }
}

export const NOTEBOOK_URL = (notebookId: string) => `https://notebooklm.google.com/notebook/${encodeURIComponent(notebookId)}`;

/** Loại source của Google Doc trên Drive theo `nlm source list --json`. */
export const NLM_DRIVE_DOC_TYPE = "google_docs";
