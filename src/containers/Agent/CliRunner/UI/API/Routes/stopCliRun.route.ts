import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { StopCliRunController } from "../Controllers/StopCliRunController";
import { stopCliRunContract } from "../Requests/CliRunParamsRequest";

export const stopCliRunRoute = defineRoute({
  ...stopCliRunContract,
  operationId: "stopCliRun",
  method: "delete",
  path: "/api/agent/runs/{runId}",
  tags: ["CliRunner"],
  summary: "Dừng run CLI (idempotent); STATUS STOPPED đi qua SSE",
  controller: StopCliRunController,
});
