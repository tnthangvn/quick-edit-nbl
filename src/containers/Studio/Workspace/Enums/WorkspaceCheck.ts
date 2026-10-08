import { z } from "zod";

/** Mục được kiểm tra khi bấm Kiểm tra Workspace (spec 5.4). */
export const WorkspaceCheckTarget = z.enum(["FOLDER", "GIT_REMOTE", "DRIVE", "NOTEBOOK"]).meta({ id: "WorkspaceCheckTarget" });
export type WorkspaceCheckTarget = z.infer<typeof WorkspaceCheckTarget>;

/** Kết quả từng mục: OK, ERROR (kèm mã lỗi), SKIPPED (Workspace không cấu hình mục này). */
export const WorkspaceCheckStatus = z.enum(["OK", "ERROR", "SKIPPED"]).meta({ id: "WorkspaceCheckStatus" });
export type WorkspaceCheckStatus = z.infer<typeof WorkspaceCheckStatus>;
