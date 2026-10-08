import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { CliRunEvent } from "../../../Events/CliRunEvent";

const params = z.object({ runId: z.string().min(1).max(100) });

export const streamCliRunEventsContract = defineContract({
  request: { params },
  responses: {
    200: { eventStream: CliRunEvent },
    404: ErrorResponse,
  },
});

export const stopCliRunContract = defineContract({
  request: { params },
  responses: {
    204: null,
    404: ErrorResponse,
  },
});
