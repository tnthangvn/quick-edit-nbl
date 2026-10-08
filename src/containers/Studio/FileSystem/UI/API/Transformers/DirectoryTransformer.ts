import "server-only";
import { z } from "zod";

export const DirectoryEntryResponse = z.object({ name: z.string() }).meta({ id: "DirectoryEntry" });

export const BrowseDirectoryResponse = z
  .object({
    path: z.string(),
    /** null = `path` là gốc hệ thống (không còn thư mục cha để lên). */
    parent: z.string().nullable(),
    writable: z.boolean(),
    entries: z.array(DirectoryEntryResponse),
  })
  .meta({ id: "BrowseDirectoryResult" });
