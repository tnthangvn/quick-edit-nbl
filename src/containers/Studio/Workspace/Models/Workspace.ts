import { z } from "zod";
import { WorkspaceStatus } from "../Enums/WorkspaceStatus";

/** Một bản ghi trong registry Workspace (spec 5.3). Model nội bộ: snake_case, khớp file JSON / bảng Postgres. */
export const WorkspaceRow = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().nullable(),
  path: z.string().min(1),
  specs_dir: z.string(),
  /** CSV thứ tự cố định "LOCAL[,GIT][,DRIVE]" — storageTypesOf() trong Setting/Models/WorkspaceConfig sinh ra. */
  storage_type: z.string(),
  storage_label: z.string().nullable(),
  notebook_id: z.string().nullable(),
  status: WorkspaceStatus,
  last_opened_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkspaceRow = z.infer<typeof WorkspaceRow>;

declare module "@/ship/contracts/data" {
  interface DataModels {
    workspaces: WorkspaceRow;
  }
}
