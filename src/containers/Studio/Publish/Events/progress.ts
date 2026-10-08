import "server-only";
import type { PublishProgressEvent } from "@/ship/contracts/events";
import type { PublishRun } from "../Models/PublishRun";

/** Ảnh chụp một lần chạy dưới dạng event PUBLISH_PROGRESS (gửi ra SSE). */
export const toProgressEvent = (run: PublishRun): PublishProgressEvent => ({
  type: "PUBLISH_PROGRESS",
  workspaceId: run.workspaceId,
  runId: run.runId,
  file: run.file,
  steps: run.steps.map((s) => ({ ...s })),
  finished: run.finished,
});
