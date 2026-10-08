import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { StartCliRunController } from "../Controllers/StartCliRunController";
import { startCliRunContract } from "../Requests/StartCliRunRequest";

export const startCliRunRoute = defineRoute({
  ...startCliRunContract,
  operationId: "startCliRun",
  method: "post",
  path: "/api/agent/runs",
  tags: ["CliRunner"],
  summary: "Chạy CLI agent trong sandbox (bản sao specsDir)",
  description:
    "Trả runId ngay; theo dõi qua GET /api/agent/runs/{runId}/events. Khi xong, mỗi file .md CLI sửa được đẩy thành SPEC_PROPOSED " +
    "(sourceId = runId) trên SSE của workspace. Không ghi file thật. Mỗi workspace một run đang chạy (409).",
  controller: StartCliRunController,
});
