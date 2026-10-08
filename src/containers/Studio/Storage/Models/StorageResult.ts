import type { StorageType } from "@/ship/contracts/enums/StorageType";
import type { WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";

export type PullResult = { storageType: StorageType; files: string[]; headSha: string | null };

export type PushResult = {
  storageType: StorageType;
  files: string[];
  branch: string | null;
  commitSha: string | null;
  pushed: boolean;
  pullRequest: { number: number; url: string } | null;
};

export type StorageStatus = {
  storageType: StorageType;
  /** Branch cấu hình (Git), null với Local / Drive. */
  branch: string | null;
  currentBranch: string | null;
  /** File spec thay đổi chưa commit (Git). */
  uncommitted: number;
  /** Commit local chưa push / commit remote chưa pull (Git), null nếu chưa có ref theo dõi. */
  ahead: number | null;
  behind: number | null;
  /** File có lần đồng bộ lỗi hoặc đang chờ (Drive). */
  pendingFiles: number;
};

/**
 * Storage Drive và NotebookLM Drive Sync dùng cùng thư mục → file trên Drive lưu dạng Google Doc và chỉ ghi một lần
 * (spec 6.4, đoạn cuối).
 */
export const sharesDriveFolder = (config: WorkspaceConfig | undefined): boolean =>
  !!config?.storage.drive &&
  config.storage.type === "DRIVE" &&
  config.nbl.syncStrategy === "DRIVE_SYNC" &&
  !!config.nbl.driveFolderId &&
  config.nbl.driveFolderId === config.storage.drive.folderId;
