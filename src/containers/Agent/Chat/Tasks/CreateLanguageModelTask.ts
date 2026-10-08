import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { LlmProvider } from "@/ship/contracts/enums/agent";
import { Task } from "@/ship/parents/Task";

export type CreateLanguageModelInput = {
  provider: LlmProvider;
  model: string;
  baseUrl: string | null;
  apiKey: string | undefined;
};

/** DeepSeek dùng API tương thích OpenAI (Chat Completions). */
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

/** Tạo LanguageModel của AI SDK theo provider trong Settings (Tab 1). Không gọi mạng. */
export class CreateLanguageModelTask extends Task<CreateLanguageModelInput, LanguageModel> {
  async run({ provider, model, baseUrl, apiKey }: CreateLanguageModelInput): Promise<LanguageModel> {
    const baseURL = baseUrl || undefined;
    switch (provider) {
      case "GOOGLE":
        return createGoogle({ apiKey, baseURL })(model);
      case "ANTHROPIC":
        return createAnthropic({ apiKey, baseURL })(model);
      case "OPENAI":
        return createOpenAI({ apiKey, baseURL })(model);
      case "DEEPSEEK":
        return createOpenAI({ apiKey, baseURL: baseURL ?? DEEPSEEK_BASE_URL, name: "deepseek" }).chat(model);
      case "OLLAMA":
        return createOllama({ baseURL, headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined })(model);
    }
  }
}
