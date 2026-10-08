import { z } from "zod";

/**
 * Loại secret riêng của một Workspace (ghi-một-chiều, không bao giờ trả ra API):
 * NOTEBOOK_COOKIE (SID/HSID/SSID cho RPC), NOTEBOOK_TOKEN (SNlM0e), GIT_TOKEN (PAT riêng của Workspace),
 * GOOGLE_OAUTH (refresh token Google cho Drive / NotebookLM Drive Sync).
 */
export const WorkspaceSecretKind = z
  .enum(["NOTEBOOK_COOKIE", "NOTEBOOK_TOKEN", "GIT_TOKEN", "GOOGLE_OAUTH"])
  .meta({ id: "WorkspaceSecretKind", description: "Loại secret riêng của Workspace" });
export type WorkspaceSecretKind = z.infer<typeof WorkspaceSecretKind>;

/** Tham chiếu trong secret store: "<workspaceId>:<kind viết thường>", vd "ws_7f3a29c1:git_token". */
export const workspaceSecretRef = (workspaceId: string, kind: WorkspaceSecretKind) => `${workspaceId}:${kind.toLowerCase()}`;
