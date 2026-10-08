import { z } from "zod";
import { LlmProvider } from "@/ship/contracts/enums/agent";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { LlmConnectionTestResult } from "../Transformers/LlmConnectionTestTransformer";

export const TestLlmConnectionBody = z
  .object({
    provider: LlmProvider,
    model: z.string().trim().min(1).max(200),
    baseUrl: z.url({ protocol: /^https?$/ }).max(500).optional(),
    /** Bỏ trống → dùng key đã lưu (khi cùng provider với cấu hình hiện tại). Không bao giờ được trả lại. */
    apiKey: z.string().min(1).max(1000).optional(),
    /** Workspace đang mở (nếu có) để lấy cấu hình ghi đè. */
    workspaceId: z.string().min(1).optional(),
  })
  .meta({ id: "TestLlmConnectionBody" });

export const testLlmConnectionContract = defineContract({
  request: { body: TestLlmConnectionBody },
  responses: {
    200: LlmConnectionTestResult,
    400: ErrorResponse,
    401: ErrorResponse,
    404: ErrorResponse,
    429: ErrorResponse,
    502: ErrorResponse,
  },
});
