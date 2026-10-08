import { z } from "zod";

/**
 * Một chunk của UI message stream (Vercel AI SDK v7, header `x-vercel-ai-ui-message-stream: v1`), kết thúc bằng `data: [DONE]`.
 * FE đọc bằng `useChat` (@ai-sdk/react), không dùng type sinh từ schema này. Chunk `error` có `errorText` = ErrorCode (vd AGENT.LLM_AUTH_FAILED).
 * Tool part: `tool-list_specs`, `tool-read_spec`, `tool-propose_spec_update`.
 */
export const ChatStreamChunk = z.looseObject({}).meta({ id: "ChatStreamChunk", description: "UIMessageChunk của Vercel AI SDK v7" });
