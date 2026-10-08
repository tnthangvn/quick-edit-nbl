import type { SpecSyncStatus } from "@/ship/contracts/enums/sync";

/** Thông tin một file spec trên đĩa. `file` là đường dẫn tương đối so với thư mục spec, phân cách "/". */
export type SpecFileInfo = { file: string; size: number; updatedAt: string };

export type SpecFileWithStatus = SpecFileInfo & { syncStatus: SpecSyncStatus };

/** Vị trí thư mục spec của một Workspace (lấy từ registry). */
export type SpecsLocation = { workspacePath: string; specsDir: string };

/** Thư mục spec của một bản ghi Workspace. */
export const specsLocationOf = (ws: { path: string; specs_dir: string }): SpecsLocation => ({ workspacePath: ws.path, specsDir: ws.specs_dir });
