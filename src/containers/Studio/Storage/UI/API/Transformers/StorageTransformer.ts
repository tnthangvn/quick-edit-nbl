import "server-only";
import { z } from "zod";
import { StorageType } from "@/ship/contracts/enums/StorageType";

/** Kết quả trả nguyên từ Action (đã là DTO camelCase); schema dùng cho response và docs/api.json. */
export const PullResultResponse = z
  .object({
    storageType: StorageType,
    /** Git: file đổi sau khi pull (tương đối gốc repo). Drive: file đã tải về. */
    files: z.array(z.string()),
    headSha: z.string().nullable(),
  })
  .meta({ id: "PullResult" });

export const PushResultResponse = z
  .object({
    storageType: StorageType,
    /** File đã commit (Git, tương đối thư mục spec) hoặc đã tải lên (Drive). */
    files: z.array(z.string()),
    branch: z.string().nullable(),
    commitSha: z.string().nullable(),
    pushed: z.boolean(),
    pullRequest: z.object({ number: z.number().int(), url: z.string() }).nullable(),
  })
  .meta({ id: "PushResult" });

export const StorageStatusResponse = z
  .object({
    storageType: StorageType,
    branch: z.string().nullable(),
    currentBranch: z.string().nullable(),
    uncommitted: z.number().int().nonnegative(),
    ahead: z.number().int().nonnegative().nullable(),
    behind: z.number().int().nonnegative().nullable(),
    pendingFiles: z.number().int().nonnegative(),
  })
  .meta({ id: "StorageStatus" });

/** 1 item / storage đang bật (Git, Drive); rỗng = chỉ Local. */
export const PullResultListResponse = z.object({ items: z.array(PullResultResponse) }).meta({ id: "PullResultList" });
export const PushResultListResponse = z.object({ items: z.array(PushResultResponse) }).meta({ id: "PushResultList" });
export const StorageStatusListResponse = z.object({ items: z.array(StorageStatusResponse) }).meta({ id: "StorageStatusList" });

export const GoogleOAuthStartResponse = z.object({ authUrl: z.string() }).meta({ id: "GoogleOAuthStart" });

export const GoogleOAuthStatusResponse = z
  .object({
    /** Đã khai GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. */
    configured: z.boolean(),
    /** Đã có refresh token (đăng nhập xong). */
    connected: z.boolean(),
  })
  .meta({ id: "GoogleOAuthStatus" });
