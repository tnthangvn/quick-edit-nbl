import { z } from "zod";

/** Trạng thái đồng bộ của một file spec (Sidebar badge, spec 3.2). */
export const SpecSyncStatus = z.enum(["SYNCED", "UNSAVED", "SYNCING", "ERROR"]).meta({ id: "SpecSyncStatus" });
export type SpecSyncStatus = z.infer<typeof SpecSyncStatus>;

/** Đích trong pipeline sau Approve (spec 3.3.1, 6.4). */
export const PublishTarget = z.enum(["LOCAL", "GIT", "DRIVE", "NOTEBOOK"]).meta({ id: "PublishTarget" });
export type PublishTarget = z.infer<typeof PublishTarget>;

/** Trạng thái từng đích trong pipeline. */
export const PublishStepStatus = z.enum(["PENDING", "RUNNING", "DONE", "ERROR", "SKIPPED"]).meta({ id: "PublishStepStatus" });
export type PublishStepStatus = z.infer<typeof PublishStepStatus>;

/** Chiến lược đồng bộ NotebookLM (spec Tab 3). */
export const SyncStrategy = z.enum(["DRIVE_SYNC", "RPC"]).meta({ id: "SyncStrategy" });
export type SyncStrategy = z.infer<typeof SyncStrategy>;

/** Cách đẩy thay đổi Git (spec 3.0.1). */
export const PublishMode = z.enum(["PUSH", "PULL_REQUEST"]).meta({ id: "PublishMode" });
export type PublishMode = z.infer<typeof PublishMode>;

export const GitProvider = z.enum(["GITHUB", "GITLAB", "BITBUCKET", "GITEA", "GENERIC"]).meta({ id: "GitProvider" });
export type GitProvider = z.infer<typeof GitProvider>;

export const ConnectorType = z.enum(["CLI", "MCP", "TOKEN", "SSH"]).meta({ id: "ConnectorType" });
export type ConnectorType = z.infer<typeof ConnectorType>;
