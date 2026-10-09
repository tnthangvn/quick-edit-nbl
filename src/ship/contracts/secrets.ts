import { z } from "zod";

/**
 * Secret đã mã hoá (model secrets, dùng chung mọi container qua ship/adapters/secrets).
 * `value` luôn là chuỗi "enc:v1:..." (xem ship/adapters/cipher), không bao giờ là plaintext.
 * Migration Postgres: Studio/Setting/Data/Migrations/*_create_secrets.ts.
 */
export const SecretRow = z.object({
  id: z.string(),
  /** Tham chiếu duy nhất, vd "llm:google", "connector:<id>:token", "<workspaceId>:git_token". */
  ref: z.string().min(1),
  value: z.string().startsWith("enc:v1:"),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SecretRow = z.infer<typeof SecretRow>;

declare module "@/ship/contracts/data" {
  interface DataModels {
    secrets: SecretRow;
  }
}
