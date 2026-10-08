import { z } from "zod";

/** ACTIVE: thư mục làm việc còn tồn tại. FOLDER_MISSING: thư mục đã bị xoá / di chuyển (spec 3.0). */
export const WorkspaceStatus = z
  .enum(["ACTIVE", "FOLDER_MISSING"])
  .meta({ id: "WorkspaceStatus", description: "Trạng thái thư mục làm việc của Workspace" });
export type WorkspaceStatus = z.infer<typeof WorkspaceStatus>;
