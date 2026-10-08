import { z } from "zod";

/** Nơi lưu file .md của Workspace (spec 3.0.1). */
export const StorageType = z.enum(["LOCAL", "GIT", "DRIVE"]).meta({ id: "StorageType", description: "Nơi lưu file spec" });
export type StorageType = z.infer<typeof StorageType>;
