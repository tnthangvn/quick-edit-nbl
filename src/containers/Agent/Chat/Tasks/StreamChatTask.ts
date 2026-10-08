import "server-only";
import {
  convertToModelMessages,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type ToolSet,
  type UIMessageChunk,
} from "ai";
import { logger } from "@/ship/adapters/logger";
import { Task } from "@/ship/parents/Task";
import { InvalidChatMessagesException } from "../Exceptions/InvalidChatMessagesException";
import { toLlmException } from "../Exceptions/LlmExceptions";

export type StreamChatInput = {
  model: LanguageModel;
  modelId: string;
  instructions: string;
  /** UIMessage[] từ useChat, chưa tin cậy: validate lại bằng AI SDK. */
  messages: unknown[];
  tools: ToolSet;
  temperature: number;
  signal?: AbortSignal;
};

/** Số bước tối đa (gọi model ↔ chạy tool) trong một lượt chat. */
const MAX_STEPS = 10;

/**
 * Gọi streamText và trả UI message stream (giao thức của useChat).
 * Lỗi giữa chừng đi ra dạng chunk `error` với `errorText` = mã lỗi (vd "AGENT.LLM_AUTH_FAILED"), không lộ message gốc của provider.
 */
export class StreamChatTask extends Task<StreamChatInput, ReadableStream<UIMessageChunk>> {
  async run({ model, modelId, instructions, messages, tools, temperature, signal }: StreamChatInput): Promise<ReadableStream<UIMessageChunk>> {
    const validated = await safeValidateUIMessages({ messages, tools });
    if (!validated.success) throw new InvalidChatMessagesException(undefined, { cause: validated.error });

    const result = streamText({
      model,
      instructions,
      messages: await convertToModelMessages(validated.data, { tools, ignoreIncompleteToolCalls: true }),
      tools,
      temperature,
      stopWhen: isStepCount(MAX_STEPS),
      abortSignal: signal,
      onError: ({ error }) => {
        const mapped = toLlmException(error, { model: modelId });
        logger.warn({ code: mapped.code, cause: describe(error) }, "chat stream error");
      },
    });

    return toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: validated.data,
      onError: (error) => toLlmException(error, { model: modelId }).code,
    });
  }
}

/** Tóm tắt lỗi để log: không ghi requestBodyValues (chứa toàn bộ hội thoại). */
function describe(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const status = (error as { statusCode?: number }).statusCode;
  return { name: error.name, message: error.message, ...(status !== undefined && { status }) };
}
