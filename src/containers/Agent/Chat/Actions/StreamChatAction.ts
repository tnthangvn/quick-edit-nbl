import "server-only";
import type { UIMessageChunk } from "ai";
import { studio } from "@/containers/providers";
import type { AgentSettingsAccess, SpecAccess } from "@/ship/contracts/studioAccess";
import { Action } from "@/ship/parents/Action";
import { GetAgentSessionTask } from "../../Session/Tasks/GetAgentSessionTask";
import { SaveSessionMessagesTask } from "../../Session/Tasks/SaveSessionMessagesTask";
import { BuildChatInstructionsTask } from "../Tasks/BuildChatInstructionsTask";
import { CreateChatToolsTask } from "../Tasks/CreateChatToolsTask";
import { CreateLanguageModelTask } from "../Tasks/CreateLanguageModelTask";
import { LoadContextSpecsTask } from "../Tasks/LoadContextSpecsTask";
import { ResolveApiKeyTask } from "../Tasks/ResolveApiKeyTask";
import { StreamChatTask } from "../Tasks/StreamChatTask";

export type StreamChatInput = {
  workspaceId: string;
  /** Phiên chat chứa lượt này: hội thoại được lưu lại sau khi stream xong. */
  sessionId: string;
  messages: unknown[];
  contextFiles: string[];
  signal?: AbortSignal;
};

/**
 * Một lượt chat ở chế độ Direct API (spec 6.1): gom spec trong context vào system prompt, cấp tools 5.2,
 * stream câu trả lời. Đề xuất sửa đi qua event SPEC_PROPOSED, không ghi file.
 * Lỗi trước khi stream (workspace, key, spec context) ném AppException → ErrorResponse.
 */
export class StreamChatAction extends Action<StreamChatInput, ReadableStream<UIMessageChunk>> {
  constructor(
    private readonly specs: SpecAccess = studio.specs(),
    private readonly settings: AgentSettingsAccess = studio.agentSettings(),
    private readonly resolveApiKey = new ResolveApiKeyTask(),
    private readonly createModel = new CreateLanguageModelTask(),
    private readonly loadContext = new LoadContextSpecsTask(specs),
    private readonly buildInstructions = new BuildChatInstructionsTask(),
    private readonly createTools = new CreateChatToolsTask(specs),
    private readonly streamChat = new StreamChatTask(),
    private readonly getSession = new GetAgentSessionTask(),
    private readonly saveMessages = new SaveSessionMessagesTask(),
  ) {
    super();
  }

  async run({ workspaceId, sessionId, messages, contextFiles, signal }: StreamChatInput): Promise<ReadableStream<UIMessageChunk>> {
    const workspace = await this.specs.getWorkspace(workspaceId);
    await this.getSession.run({ sessionId, workspaceId });
    const { api } = await this.settings.get(workspaceId);
    const apiKey = await this.resolveApiKey.run({ provider: api.provider, apiKeyRef: api.apiKeyRef });

    const [contextSpecs, tools] = await Promise.all([
      this.loadContext.run({ workspaceId, files: contextFiles }),
      this.createTools.run({ workspaceId }),
    ]);
    const instructions = await this.buildInstructions.run({
      systemPrompt: api.systemPrompt,
      workspaceName: workspace.name,
      specs: contextSpecs,
    });
    const model = await this.createModel.run({ provider: api.provider, model: api.model, baseUrl: api.baseUrl, apiKey });

    return this.streamChat.run({
      model,
      modelId: api.model,
      instructions,
      messages,
      tools,
      temperature: api.temperature,
      signal,
      onEnd: (all) => this.saveMessages.run({ sessionId, messages: all as unknown as Record<string, unknown>[] }),
    });
  }
}
