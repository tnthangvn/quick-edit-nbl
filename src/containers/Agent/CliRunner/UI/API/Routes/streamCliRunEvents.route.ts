import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { StreamCliRunEventsController } from "../Controllers/StreamCliRunEventsController";
import { streamCliRunEventsContract } from "../Requests/CliRunParamsRequest";

export const streamCliRunEventsRoute = defineRoute({
  ...streamCliRunEventsContract,
  operationId: "streamCliRunEvents",
  method: "get",
  path: "/api/agent/runs/{runId}/events",
  tags: ["CliRunner"],
  summary: "SSE event của một run CLI (phát lại từ đầu cho client vào muộn)",
  description: "Mỗi event là CliRunEvent; khử trùng theo `seq` khi EventSource nối lại. Đóng EventSource khi nhận STATUS DONE / FAILED / STOPPED.",
  controller: StreamCliRunEventsController,
});
