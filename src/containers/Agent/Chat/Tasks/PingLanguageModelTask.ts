import "server-only";
import { generateText, type LanguageModel } from "ai";
import { Task } from "@/ship/parents/Task";
import { toLlmException } from "../Exceptions/LlmExceptions";

const PING_TIMEOUT_MS = 20_000;

/** Gọi model một lượt rất ngắn để kiểm tra key / model / base URL (nút Test ở Settings Tab 1). Trả độ trễ (ms). */
export class PingLanguageModelTask extends Task<{ model: LanguageModel; modelId: string }, number> {
  async run({ model, modelId }: { model: LanguageModel; modelId: string }): Promise<number> {
    const started = performance.now();
    try {
      await generateText({ model, prompt: "ping", maxOutputTokens: 16, maxRetries: 0, timeout: PING_TIMEOUT_MS });
    } catch (err) {
      throw toLlmException(err, { model: modelId });
    }
    return Math.round(performance.now() - started);
  }
}
