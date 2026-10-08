import { z } from "zod";

/** Binary (gh, npx, /usr/local/bin/glab...): không khoảng trắng, không bắt đầu bằng "-" (chạy không qua shell). */
export const CommandField = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine((c) => /^[\w.@+/~-]+$/.test(c) && !c.startsWith("-"), { message: "CONNECTOR.INVALID_COMMAND" });

export const HttpUrlField = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (u) => {
      try {
        const url = new URL(u);
        return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
      } catch {
        return false;
      }
    },
    { message: "CONNECTOR.INVALID_URL" },
  );

/** Tên env / header (khoá của secret). */
export const SecretKeyField = z
  .string()
  .max(128)
  .refine((k) => /^[A-Za-z_][\w-]*$/.test(k), { message: "CONNECTOR.INVALID_SECRET_KEY" });

export const ArgsField = z.array(z.string().max(1024)).max(50);
export const EnvField = z.record(SecretKeyField, z.string().max(4096));
export const HeadersField = z.record(SecretKeyField, z.string().max(4096));
export const AgentToolsField = z.array(z.string().min(1).max(128)).max(200);
export const ConnectorIdParams = z.object({ connectorId: z.string().min(1).max(64) });
