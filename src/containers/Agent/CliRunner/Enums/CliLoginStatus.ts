import { z } from "zod";

/** Trạng thái đăng nhập của CLI agent, dò best-effort. NOT_APPLICABLE: CLI dùng API key của model (Aider). */
export const CliLoginStatus = z
  .enum(["LOGGED_IN", "LOGGED_OUT", "UNKNOWN", "NOT_APPLICABLE"])
  .meta({ id: "CliLoginStatus" });
export type CliLoginStatus = z.infer<typeof CliLoginStatus>;
