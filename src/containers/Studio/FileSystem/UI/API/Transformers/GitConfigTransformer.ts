import "server-only";
import { z } from "zod";
import { GitProvider } from "@/ship/contracts/enums/sync";

/** Kết quả đọc `.git/config` của thư mục (Wizard › Nơi lưu: điền nhanh remote). */
export const GitConfigResponse = z
  .object({
    hasGit: z.boolean(),
    /** URL remote `origin` (hoặc remote đầu tiên), đã bỏ user/token. */
    remote: z.string().nullable(),
    provider: GitProvider.nullable(),
    host: z.string().nullable(),
    /** owner/repo */
    repo: z.string().nullable(),
    /** `[user] name` / `email` khai trong .git/config của repo. */
    userName: z.string().nullable(),
    userEmail: z.string().nullable(),
  })
  .meta({ id: "GitConfigInfo" });
