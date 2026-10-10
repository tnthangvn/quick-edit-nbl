import "server-only";
import { NotebookLmClient } from "@/ship/adapters/notebooklm";
import { secrets } from "@/ship/adapters/secrets";
import { workspaceSecretRef } from "../../Setting/Enums/WorkspaceSecretKind";

/** Cookie NotebookLM dùng chung cả app (Settings › Integrations › NotebookLM). */
export const NOTEBOOK_COOKIE_REF = "notebooklm:cookie";

/** Thứ tự tìm cookie: secret NOTEBOOK_COOKIE riêng của Workspace, rồi cookie dùng chung. */
export const notebookCookieRefs = (workspaceId?: string): string[] =>
  workspaceId ? [workspaceSecretRef(workspaceId, "NOTEBOOK_COOKIE"), NOTEBOOK_COOKIE_REF] : [NOTEBOOK_COOKIE_REF];

/** Tạo client NotebookLM đọc cookie theo `refs` lúc gọi (giải mã ngay lúc dùng). */
export type NotebookClientFactory = (refs: string[]) => NotebookLmClient;

export const createNotebookClient: NotebookClientFactory = (refs) =>
  new NotebookLmClient(async () => {
    for (const ref of refs) {
      const value = await secrets.get(ref);
      if (value?.trim()) return value;
    }
    return undefined;
  });
