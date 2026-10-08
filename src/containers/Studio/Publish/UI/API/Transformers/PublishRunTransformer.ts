import "server-only";
import { z } from "zod";
import { PublishStep } from "@/ship/contracts/events";
import { Transformer } from "@/ship/parents/Transformer";
import type { PublishRun } from "../../../Models/PublishRun";

export const PublishRunResponse = z
  .object({
    runId: z.string(),
    workspaceId: z.string(),
    file: z.string(),
    steps: z.array(PublishStep),
    finished: z.boolean(),
    createdAt: z.iso.datetime(),
    finishedAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "PublishRun" });
export type PublishRunResponse = z.infer<typeof PublishRunResponse>;

export const PublishRunListResponse = z.object({ items: z.array(PublishRunResponse) }).meta({ id: "PublishRunList" });

export class PublishRunTransformer extends Transformer<PublishRun, PublishRunResponse> {
  transform(r: PublishRun): PublishRunResponse {
    return {
      runId: r.runId,
      workspaceId: r.workspaceId,
      file: r.file,
      steps: r.steps,
      finished: r.finished,
      createdAt: r.createdAt,
      finishedAt: r.finishedAt,
    };
  }
}
