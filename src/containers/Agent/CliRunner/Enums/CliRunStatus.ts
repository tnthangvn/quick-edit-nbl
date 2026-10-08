import { z } from "zod";

/** Trạng thái một lần chạy CLI agent. DONE / FAILED / STOPPED là trạng thái kết thúc. */
export const CliRunStatus = z
  .enum(["RUNNING", "DONE", "FAILED", "STOPPED"])
  .meta({ id: "CliRunStatus", description: "Trạng thái lần chạy CLI agent" });
export type CliRunStatus = z.infer<typeof CliRunStatus>;
