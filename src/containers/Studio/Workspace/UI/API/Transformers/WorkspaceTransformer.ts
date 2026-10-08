import "server-only";
import { z } from "zod";
import { StorageType } from "@/ship/contracts/enums/StorageType";
import { Transformer } from "@/ship/parents/Transformer";
import { WorkspaceStatus } from "../../../Enums/WorkspaceStatus";
import type { WorkspaceRow } from "../../../Models/Workspace";

/** DTO trả ra API (camelCase). */
export const WorkspaceResponse = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    path: z.string(),
    specsDir: z.string(),
    storageType: StorageType,
    storageLabel: z.string().nullable(),
    notebookId: z.string().nullable(),
    status: WorkspaceStatus,
    lastOpenedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Workspace" });
export type WorkspaceResponse = z.infer<typeof WorkspaceResponse>;

export const WorkspaceListResponse = z.object({ items: z.array(WorkspaceResponse) }).meta({ id: "WorkspaceList" });

export class WorkspaceTransformer extends Transformer<WorkspaceRow, WorkspaceResponse> {
  transform(w: WorkspaceRow): WorkspaceResponse {
    return {
      id: w.id,
      name: w.name,
      description: w.description,
      path: w.path,
      specsDir: w.specs_dir,
      storageType: w.storage_type,
      storageLabel: w.storage_label,
      notebookId: w.notebook_id,
      status: w.status,
      lastOpenedAt: w.last_opened_at,
      createdAt: w.created_at,
    };
  }
}
