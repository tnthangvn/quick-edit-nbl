import "server-only";
import { secrets as defaultSecrets, type SecretStore } from "@/ship/adapters/secrets";
import { env } from "@/ship/engine/env";
import { Task } from "@/ship/parents/Task";
import { SecretNotSetException } from "../../Setting/Exceptions/SecretNotSetException";
import { googleSecretRefs } from "../../Storage/Models/googleSecret";
import { WorkspaceDriveAccessDeniedException } from "../Exceptions/WorkspaceDriveAccessDeniedException";
import { WorkspaceDriveNotConfiguredException } from "../Exceptions/WorkspaceDriveNotConfiguredException";

const TIMEOUT_MS = 15_000;
const FOLDER_MIME = "application/vnd.google-apps.folder";

type DriveFile = { name?: string; mimeType?: string; capabilities?: { canAddChildren?: boolean; canListChildren?: boolean } };

/**
 * Nút Kiểm tra quyền Drive: đổi refresh token (secret GOOGLE_OAUTH của Workspace, nếu chưa có thì token dùng chung
 * lưu lúc đăng nhập từ Wizard) lấy access token,
 * đọc thư mục và quyền thêm file. Secret chấp nhận chuỗi refresh token hoặc JSON có `refresh_token`.
 */
export class CheckDriveAccessTask extends Task<{ workspaceId: string; folderId: string }, { folderName: string }> {
  constructor(
    private readonly store: SecretStore = defaultSecrets,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    super();
  }

  async run({ workspaceId, folderId }: { workspaceId: string; folderId: string }): Promise<{ folderName: string }> {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env();
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new WorkspaceDriveNotConfiguredException();
    let refreshToken: string | undefined;
    for (const ref of googleSecretRefs(workspaceId)) {
      const stored = await this.store.get(ref);
      refreshToken = stored ? parseRefreshToken(stored) || undefined : undefined;
      if (refreshToken) break;
    }
    if (!refreshToken) throw new SecretNotSetException({ kind: "GOOGLE_OAUTH" });

    const tokenRes = await this.fetchFn("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!tokenRes.ok) throw new SecretNotSetException({ kind: "GOOGLE_OAUTH" });
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const fields = "name,mimeType,capabilities(canAddChildren,canListChildren)";
    const res = await this.fetchFn(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
      { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) throw new WorkspaceDriveAccessDeniedException({ status: res.status });
    const file = (await res.json()) as DriveFile;
    if (file.mimeType !== FOLDER_MIME || !file.capabilities?.canAddChildren || !file.capabilities?.canListChildren) {
      throw new WorkspaceDriveAccessDeniedException({ status: res.status });
    }
    return { folderName: file.name ?? folderId };
  }
}

function parseRefreshToken(stored: string): string | undefined {
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (parsed && typeof parsed === "object" && typeof (parsed as { refresh_token?: unknown }).refresh_token === "string") {
      return (parsed as { refresh_token: string }).refresh_token;
    }
  } catch {
    // Không phải JSON: chính là refresh token.
  }
  return stored.trim() || undefined;
}
