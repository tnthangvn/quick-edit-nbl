import { z } from "zod";

/** Luồng xuất của tiến trình CLI. */
export const CliLogStream = z.enum(["STDOUT", "STDERR"]).meta({ id: "CliLogStream" });
export type CliLogStream = z.infer<typeof CliLogStream>;
