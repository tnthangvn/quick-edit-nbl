import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { TestLlmConnectionController } from "../Controllers/TestLlmConnectionController";
import { testLlmConnectionContract } from "../Requests/TestLlmConnectionRequest";

export const testLlmConnectionRoute = defineRoute({
  ...testLlmConnectionContract,
  operationId: "testLlmConnection",
  method: "post",
  path: "/api/chat/test-connection",
  tags: ["Chat"],
  summary: "Kiểm tra API key / model / base URL (Settings Tab 1, nút Test)",
  controller: TestLlmConnectionController,
});
