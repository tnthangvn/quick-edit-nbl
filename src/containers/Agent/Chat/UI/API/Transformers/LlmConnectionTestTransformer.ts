import "server-only";
import { z } from "zod";
import { Transformer } from "@/ship/parents/Transformer";

export const LlmConnectionTestResult = z
  .object({
    ok: z.boolean(),
    /** Thời gian một lượt gọi model ngắn, ms. */
    latencyMs: z.number().int().nonnegative(),
  })
  .meta({ id: "LlmConnectionTestResult" });
export type LlmConnectionTestResult = z.infer<typeof LlmConnectionTestResult>;

export class LlmConnectionTestTransformer extends Transformer<{ latencyMs: number }, LlmConnectionTestResult> {
  transform({ latencyMs }: { latencyMs: number }): LlmConnectionTestResult {
    return { ok: true, latencyMs };
  }
}
