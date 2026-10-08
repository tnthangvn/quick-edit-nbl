import "server-only";
import { z } from "zod";
import { Transformer } from "@/ship/parents/Transformer";

export const CliRunStarted = z.object({ runId: z.string() }).meta({ id: "CliRunStarted" });
export type CliRunStarted = z.infer<typeof CliRunStarted>;

export class CliRunTransformer extends Transformer<{ runId: string }, CliRunStarted> {
  transform({ runId }: { runId: string }): CliRunStarted {
    return { runId };
  }
}
