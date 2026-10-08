import "server-only";
import { createDocument, type ZodOpenApiOperationObject, type ZodOpenApiPathsObject, type ZodOpenApiResponsesObject } from "zod-openapi";
import { AgentSettings, CliProfile } from "@/ship/contracts/agentSettings";
import { AgentMode, CliAgentKind, CliOutputFormat, LlmProvider } from "@/ship/contracts/enums/agent";
import { StorageType } from "@/ship/contracts/enums/StorageType";
import { ConnectorType, GitProvider, PublishMode, PublishStepStatus, PublishTarget, SpecSyncStatus, SyncStrategy } from "@/ship/contracts/enums/sync";
import { ErrorCode, ErrorResponse, ValidationErrorResponse } from "@/ship/contracts/errors";
import { WorkspaceEvent } from "@/ship/contracts/events";
import type { EventStreamResponse, RouteDefinition, SuccessResponseDef } from "@/ship/engine/defineRoute";

const DESCRIPTIONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  410: "Gone",
  413: "Payload Too Large",
  422: "Validation Failed",
  423: "Locked",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

/** Mô tả tag = container (spec mục 2.5). Thêm container mới thì thêm dòng ở đây. */
const TAG_DESCRIPTIONS: Record<string, string> = {
  Workspace: "Registry Workspace: tạo, mở, kiểm tra (spec 3.0, 6.3)",
  Spec: "Đọc / ghi / đổi tên / xoá file spec .md",
  Setting: "Cấu hình app và Workspace, secret",
  Connector: "Kết nối Git provider: CLI, MCP, Token, SSH (spec 3.0.2)",
  Storage: "Pull / publish cho Local, Git, Drive",
  Notebook: "Đồng bộ NotebookLM",
  Publish: "Pipeline sau Approve (spec 6.4)",
  Chat: "AI Agent qua Direct API",
  CliRunner: "AI Agent qua CLI (Claude Code, Codex, Antigravity, Aider)",
};

const isEventStream = (d: SuccessResponseDef): d is EventStreamResponse => !!d && typeof d === "object" && "eventStream" in d;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOperation(route: RouteDefinition<any, any>): ZodOpenApiOperationObject {
  const responses: Record<string, ZodOpenApiResponsesObject[keyof ZodOpenApiResponsesObject]> = {};

  for (const [status, def] of Object.entries(route.responses) as [string, SuccessResponseDef][]) {
    const code = Number(status);
    if (def === null || code === 204) responses[status] = { description: DESCRIPTIONS[code] };
    else if (isEventStream(def)) responses[status] = { description: "Server-Sent Events", content: { "text/event-stream": { schema: def.eventStream } } };
    else responses[status] = { description: DESCRIPTIONS[code] ?? status, content: { "application/json": { schema: def } } };
  }

  const req = route.request ?? {};
  if (req.body) responses["400"] ??= { description: DESCRIPTIONS[400], content: { "application/json": { schema: ErrorResponse } } };
  if (req.params || req.query || req.body) {
    responses["422"] = { description: DESCRIPTIONS[422], content: { "application/json": { schema: ValidationErrorResponse } } };
  }
  responses["500"] = { description: DESCRIPTIONS[500], content: { "application/json": { schema: ErrorResponse } } };

  const operation: ZodOpenApiOperationObject = {
    operationId: route.operationId,
    tags: route.tags,
    summary: route.summary,
    responses: responses as ZodOpenApiResponsesObject,
  };
  if (route.description) operation.description = route.description;
  if (req.params || req.query) {
    operation.requestParams = {
      ...(req.params && { path: req.params }),
      ...(req.query && { query: req.query }),
    };
  }
  if (req.body) operation.requestBody = { required: true, content: { "application/json": { schema: req.body } } };
  return operation;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildOpenApiDocument(routes: RouteDefinition<any, any>[]) {
  const paths: ZodOpenApiPathsObject = {};
  const seen = new Set<string>();
  for (const route of routes) {
    if (seen.has(route.operationId)) throw new Error(`Trùng operationId: ${route.operationId}`);
    seen.add(route.operationId);
    paths[route.path] ??= {};
    if (paths[route.path][route.method]) throw new Error(`Trùng route: ${route.method.toUpperCase()} ${route.path}`);
    paths[route.path][route.method] = toOperation(route);
  }

  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "Spec Studio API",
      version: "1.0.0",
      description: "API local của Spec Studio. Lỗi chỉ trả mã (ErrorCode); FE tự dịch.",
    },
    servers: [{ url: "/", description: "Spec Studio local" }],
    tags: [...new Set(routes.flatMap((r) => r.tags))].sort().map((name) => {
      if (!TAG_DESCRIPTIONS[name]) throw new Error(`Tag ${name} chưa có mô tả trong TAG_DESCRIPTIONS`);
      return { name, description: TAG_DESCRIPTIONS[name] };
    }),
    paths,
    // Schema dùng chung luôn có trong spec (kể cả khi chưa route nào tham chiếu) để FE sinh enum / type event.
    components: {
      schemas: {
        ErrorCode,
        StorageType,
        SpecSyncStatus,
        PublishTarget,
        PublishStepStatus,
        SyncStrategy,
        PublishMode,
        GitProvider,
        ConnectorType,
        AgentMode,
        LlmProvider,
        CliAgentKind,
        CliOutputFormat,
        CliProfile,
        AgentSettings,
        WorkspaceEvent,
      },
    },
  });
}
