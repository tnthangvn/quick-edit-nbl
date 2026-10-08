import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { StreamChatController } from "../Controllers/StreamChatController";
import { streamChatContract } from "../Requests/StreamChatRequest";

export const streamChatRoute = defineRoute({
  ...streamChatContract,
  operationId: "streamChat",
  method: "post",
  path: "/api/chat",
  tags: ["Chat"],
  summary: "Chat với Agent (Direct API), trả UI message stream cho useChat",
  description:
    "Body của useChat (DefaultChatTransport) + workspaceId + contextFiles. Tools: list_specs, read_spec, propose_spec_update " +
    "(phát SPEC_PROPOSED trên GET /api/workspaces/{workspaceId}/events, không ghi file). Lỗi giữa stream: chunk `error` với errorText = ErrorCode.",
  controller: StreamChatController,
});
