import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { ChatStreamChunk } from "../Transformers/ChatStreamTransformer";

/** UIMessage của Vercel AI SDK (useChat gửi lên). Chỉ kiểm khung ở đây; nội dung `parts` được AI SDK validate kỹ ở StreamChatTask. */
export const ChatUiMessage = z
  .looseObject({
    id: z.string(),
    role: z.string().meta({ description: "system | user | assistant (giá trị của AI SDK)" }),
    parts: z.array(z.looseObject({})),
  })
  .meta({ id: "ChatUiMessage", description: "UIMessage của Vercel AI SDK v7; FE dùng type của @ai-sdk/react" });

export const StreamChatBody = z
  .object({
    workspaceId: z.string().min(1),
    messages: z.array(ChatUiMessage).min(1).max(500),
    /** Spec được tick trên Sidebar, đường dẫn tương đối trong specsDir. */
    contextFiles: z.array(z.string().min(1).max(500)).max(50).default([]),
  })
  .meta({ id: "StreamChatBody" });

export const streamChatContract = defineContract({
  request: { body: StreamChatBody },
  responses: {
    200: { eventStream: ChatStreamChunk },
    400: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});
