import { z } from "zod";
import { StorageType } from "@/ship/contracts/enums/StorageType";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceListResponse } from "../Transformers/WorkspaceTransformer";

export const WorkspaceSort = z.enum(["RECENT", "NAME"]).meta({ id: "WorkspaceSort" });

export const listWorkspacesContract = defineContract({
  request: {
    query: z.object({
      q: z.string().trim().max(200).optional().meta({ description: "Tìm theo tên" }),
      storageType: StorageType.optional(),
      sort: WorkspaceSort.default("RECENT"),
    }),
  },
  responses: { 200: WorkspaceListResponse },
});
