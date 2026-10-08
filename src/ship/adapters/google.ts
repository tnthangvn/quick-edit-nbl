import "server-only";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";
import { secrets } from "@/ship/adapters/secrets";
import { env } from "@/ship/engine/env";

/**
 * Google OAuth (Drive) + Drive API v3. Refresh token lưu trong secret store dạng JSON `{"refresh_token": "..."}`
 * (đọc được cả chuỗi trần) dưới ref do container chọn (secret GOOGLE_OAUTH của Workspace, hoặc GOOGLE_REFRESH_TOKEN_REF
 * dùng chung cả app), không bao giờ log hay trả ra API. Lỗi được phân loại thành GoogleError.kind; container đổi sang mã lỗi.
 */
export type GoogleErrorKind = "NOT_CONFIGURED" | "UNAUTHORIZED" | "NOT_FOUND" | "FAILED";

export class GoogleError extends Error {
  constructor(
    readonly kind: GoogleErrorKind,
    readonly detail?: string,
  ) {
    super(`google ${kind}`);
  }
}

/** Ref dùng chung cả app (khi đăng nhập chưa gắn với Workspace nào, vd lúc Wizard tạo Workspace). */
export const GOOGLE_REFRESH_TOKEN_REF = "google:oauth";
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const GOOGLE_DOC = "application/vnd.google-apps.document";
const FOLDER = "application/vnd.google-apps.folder";
const STATE_TTL_MS = 10 * 60_000;

function credentials(): { clientId: string; clientSecret: string } {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = env();
  if (!clientId || !clientSecret) throw new GoogleError("NOT_CONFIGURED");
  return { clientId, clientSecret };
}

export function isGoogleConfigured(): boolean {
  const e = env();
  return !!e.GOOGLE_CLIENT_ID && !!e.GOOGLE_CLIENT_SECRET;
}

// ---------- OAuth ----------

type PendingState = { redirectUri: string; secretRef: string; expiresAt: number };
const globalForOAuth = globalThis as unknown as { __specStudioOAuthStates?: Map<string, PendingState> };
const pendingStates = (globalForOAuth.__specStudioOAuthStates ??= new Map());

/**
 * URL đồng ý của Google; `state` chống CSRF, chỉ dùng được một lần trong 10 phút. `secretRef` (nơi lưu refresh token)
 * được giữ phía server theo state, callback không chọn được ref khác.
 */
export function createGoogleAuthUrl(redirectUri: string, secretRef: string): string {
  const { clientId, clientSecret } = credentials();
  const now = Date.now();
  for (const [k, v] of pendingStates) if (v.expiresAt < now) pendingStates.delete(k);
  const state = randomBytes(24).toString("base64url");
  pendingStates.set(state, { redirectUri, secretRef, expiresAt: now + STATE_TTL_MS });
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES, state, include_granted_scopes: true });
}

/** Đổi `code` lấy refresh token và lưu vào secret store (ref đã gắn với state). Ném GoogleError("UNAUTHORIZED") nếu state sai/hết hạn. */
export async function completeGoogleAuth(code: string, state: string): Promise<{ secretRef: string }> {
  const { clientId, clientSecret } = credentials();
  const pending = pendingStates.get(state);
  pendingStates.delete(state);
  if (!pending || pending.expiresAt < Date.now()) throw new GoogleError("UNAUTHORIZED", "state");
  const client = new google.auth.OAuth2(clientId, clientSecret, pending.redirectUri);
  let refreshToken: string | null | undefined;
  try {
    refreshToken = (await client.getToken({ code, redirect_uri: pending.redirectUri })).tokens.refresh_token;
  } catch (err) {
    throw new GoogleError("FAILED", errorStatus(err) ? `HTTP ${errorStatus(err)}` : undefined);
  }
  if (!refreshToken) throw new GoogleError("FAILED", "no refresh_token");
  await secrets.set(pending.secretRef, JSON.stringify({ refresh_token: refreshToken }));
  return { secretRef: pending.secretRef };
}

/** Refresh token đầu tiên tìm thấy theo thứ tự ref (chấp nhận chuỗi trần hoặc JSON có `refresh_token`). */
async function readRefreshToken(refs: readonly string[]): Promise<string | undefined> {
  for (const ref of refs) {
    const stored = await secrets.get(ref);
    if (!stored) continue;
    try {
      const parsed = JSON.parse(stored) as { refresh_token?: unknown };
      if (typeof parsed?.refresh_token === "string" && parsed.refresh_token) return parsed.refresh_token;
    } catch {
      return stored;
    }
  }
  return undefined;
}

export async function isGoogleConnected(refs: readonly string[] = [GOOGLE_REFRESH_TOKEN_REF]): Promise<boolean> {
  return isGoogleConfigured() && !!(await readRefreshToken(refs));
}

// ---------- Drive ----------

export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime: string | null; webViewLink: string | null };

/** Các thao tác Drive mà container dùng; tiêm bản giả trong test. */
export interface DriveGateway {
  getFolder(folderId: string): Promise<{ id: string; name: string }>;
  listFolder(folderId: string): Promise<DriveFile[]>;
  /** Nội dung văn bản: Google Doc xuất ra Markdown, file thường tải nguyên văn. */
  readText(file: Pick<DriveFile, "id" | "mimeType">): Promise<string>;
  /** Ghi đè (hoặc tạo) file tên `name` trong thư mục. `asGoogleDoc` → Google Doc chuyển từ Markdown. */
  upsertText(input: { folderId: string; name: string; content: string; asGoogleDoc: boolean }): Promise<DriveFile & { created: boolean }>;
}

function errorStatus(err: unknown): number | undefined {
  const e = err as { status?: number; response?: { status?: number }; code?: number | string };
  return e.status ?? e.response?.status ?? (typeof e.code === "number" ? e.code : undefined);
}

function toGoogleError(err: unknown): GoogleError {
  if (err instanceof GoogleError) return err;
  const status = errorStatus(err);
  const msg = String((err as Error)?.message ?? "");
  if (status === 401 || /invalid_grant|invalid_token|unauthorized_client/i.test(msg)) return new GoogleError("UNAUTHORIZED");
  if (status === 404 || status === 403) return new GoogleError("NOT_FOUND", status ? `HTTP ${status}` : undefined);
  return new GoogleError("FAILED", status ? `HTTP ${status}` : undefined);
}

const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const FIELDS = "id, name, mimeType, modifiedTime, webViewLink";
const toFile = (f: drive_v3.Schema$File): DriveFile => ({
  id: f.id ?? "",
  name: f.name ?? "",
  mimeType: f.mimeType ?? "",
  modifiedTime: f.modifiedTime ?? null,
  webViewLink: f.webViewLink ?? null,
});

class GoogleDriveGateway implements DriveGateway {
  constructor(private readonly drive: drive_v3.Drive) {}

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw toGoogleError(err);
    }
  }

  getFolder(folderId: string) {
    return this.call(async () => {
      const { data } = await this.drive.files.get({ fileId: folderId, fields: "id, name, mimeType", supportsAllDrives: true });
      if (data.mimeType !== FOLDER) throw new GoogleError("NOT_FOUND", "not a folder");
      return { id: data.id ?? folderId, name: data.name ?? "" };
    });
  }

  listFolder(folderId: string) {
    return this.call(async () => {
      const out: DriveFile[] = [];
      let pageToken: string | undefined;
      do {
        const { data } = await this.drive.files.list({
          q: `'${q(folderId)}' in parents and trashed = false`,
          fields: `nextPageToken, files(${FIELDS})`,
          pageSize: 200,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        out.push(...(data.files ?? []).map(toFile));
        pageToken = data.nextPageToken ?? undefined;
      } while (pageToken);
      return out;
    });
  }

  readText(file: Pick<DriveFile, "id" | "mimeType">) {
    return this.call(async () => {
      if (file.mimeType === GOOGLE_DOC) {
        const r = await this.drive.files.export({ fileId: file.id, mimeType: "text/markdown" }, { responseType: "text" });
        return String(r.data);
      }
      const r = await this.drive.files.get({ fileId: file.id, alt: "media", supportsAllDrives: true }, { responseType: "text" });
      return String(r.data);
    });
  }

  upsertText({ folderId, name, content, asGoogleDoc }: { folderId: string; name: string; content: string; asGoogleDoc: boolean }) {
    return this.call(async () => {
      const kind = asGoogleDoc ? `mimeType = '${GOOGLE_DOC}'` : `mimeType != '${GOOGLE_DOC}'`;
      const { data: found } = await this.drive.files.list({
        q: `'${q(folderId)}' in parents and name = '${q(name)}' and trashed = false and ${kind}`,
        fields: `files(${FIELDS})`,
        pageSize: 1,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      const media = { mimeType: "text/markdown", body: Readable.from([Buffer.from(content, "utf8")]) };
      const existing = found.files?.[0];
      if (existing?.id) {
        const { data } = await this.drive.files.update({ fileId: existing.id, media, fields: FIELDS, supportsAllDrives: true });
        return { ...toFile(data), created: false };
      }
      const { data } = await this.drive.files.create({
        requestBody: { name, parents: [folderId], mimeType: asGoogleDoc ? GOOGLE_DOC : "text/markdown" },
        media,
        fields: FIELDS,
        supportsAllDrives: true,
      });
      return { ...toFile(data), created: true };
    });
  }
}

/** Tạo DriveGateway từ các ref secret (thử lần lượt); tiêm bản giả trong test. */
export type DriveGatewayFactory = (refs: readonly string[]) => Promise<DriveGateway>;

/** Drive client đã xác thực bằng refresh token đã lưu (ref đầu tiên có giá trị). Ném GoogleError NOT_CONFIGURED / UNAUTHORIZED. */
export const createDriveGateway: DriveGatewayFactory = async (refs = [GOOGLE_REFRESH_TOKEN_REF]) => {
  const { clientId, clientSecret } = credentials();
  const refreshToken = await readRefreshToken(refs);
  if (!refreshToken) throw new GoogleError("UNAUTHORIZED");
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return new GoogleDriveGateway(google.drive({ version: "v3", auth }));
};

export const DRIVE_GOOGLE_DOC_MIME = GOOGLE_DOC;
