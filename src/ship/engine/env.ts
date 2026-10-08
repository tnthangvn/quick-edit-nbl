import "server-only";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { DataDriverName } from "@/ship/contracts/data";

const expandHome = (p: string) => (p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SPEC_STUDIO_HOME: z.string().default("~/.spec-studio").transform(expandHome),
    DATA_DRIVER: DataDriverName.default("JSON"),
    DATA_DIR: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
  })
  .transform((env) => ({
    ...env,
    DATA_DIR: expandHome(env.DATA_DIR ?? path.join(env.SPEC_STUDIO_HOME, "data")),
  }))
  .superRefine((env, ctx) => {
    if (env.DATA_DRIVER === "POSTGRES" && !env.DATABASE_URL) {
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "DATA_DRIVER=POSTGRES cần DATABASE_URL" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Env đã validate. Sai cấu hình thì dừng ngay khi khởi động, không chạy tiếp với giá trị mặc định sai. */
export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Cấu hình môi trường không hợp lệ: ${detail}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** Chỉ dùng trong test. */
export function resetEnvCache() {
  cached = undefined;
}

export { expandHome };
