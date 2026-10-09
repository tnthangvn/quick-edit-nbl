import "server-only";
import { connection } from "next/server";
import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { env } from "@/ship/engine/env";
import { MalformedJsonError, RequestValidationError, toErrorResponse } from "@/ship/engine/errors";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type SuccessStatus = 200 | 201 | 202 | 204;
type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 410 | 413 | 423 | 429 | 502 | 503;

/** Response stream SSE: mỗi event là một JSON khớp `event`. */
export type EventStreamResponse = { eventStream: z.ZodType };

export type SuccessResponseDef = z.ZodType | EventStreamResponse | null;

export type RouteResponses = Partial<Record<SuccessStatus, SuccessResponseDef>> &
  Partial<Record<ErrorStatus, typeof ErrorResponse>>;

export type RouteRequest = {
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodType;
};

export type RouteInput<Req extends RouteRequest> = {
  params: Req["params"] extends z.ZodType ? z.output<Req["params"]> : Record<string, never>;
  query: Req["query"] extends z.ZodType ? z.output<Req["query"]> : Record<string, never>;
  body: Req["body"] extends z.ZodType ? z.output<Req["body"]> : undefined;
  request: Request;
};

type SuccessKeys<Res extends RouteResponses> = Extract<keyof Res, SuccessStatus>;

/** Giá trị Controller trả về: một trong các status thành công đã khai, body đúng schema. SSE trả thẳng Response. */
export type RouteOutput<Res extends RouteResponses> = {
  [S in SuccessKeys<Res>]: Res[S] extends EventStreamResponse
    ? Response
    : Res[S] extends z.ZodType
      ? { status: S; body: z.input<Res[S]> }
      : { status: S };
}[SuccessKeys<Res>];

export interface RouteController<Req extends RouteRequest, Res extends RouteResponses> {
  handle(input: RouteInput<Req>): Promise<RouteOutput<Res>>;
}

/** Hợp đồng request/response của một endpoint, tách khỏi route để Controller tự lấy type mà không vòng lặp. */
export type RouteContract<Req extends RouteRequest = RouteRequest, Res extends RouteResponses = RouteResponses> = {
  request?: Req;
  responses: Res;
};

export function defineContract<const Req extends RouteRequest = Record<never, never>, const Res extends RouteResponses = RouteResponses>(
  contract: RouteContract<Req, Res>,
): RouteContract<Req, Res> {
  return contract;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReqOf<C> = C extends RouteContract<infer Req, any> ? Req : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResOf<C> = C extends RouteContract<any, infer Res> ? Res : never;

/** Input Controller nhận: params / query / body đã validate. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContractInput<C extends RouteContract<any, any>> = RouteInput<ReqOf<C>>;
/** Output Controller phải trả: một status thành công đã khai + body đúng schema. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContractOutput<C extends RouteContract<any, any>> = RouteOutput<ResOf<C>>;
/** Controller cho một contract: `class X implements ContractController<typeof xContract>`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContractController<C extends RouteContract<any, any>> = RouteController<ReqOf<C>, ResOf<C>>;

export type RouteSpec<Req extends RouteRequest, Res extends RouteResponses> = {
  /** camelCase theo use case; Orval sinh hook use<OperationId>. */
  operationId: string;
  method: HttpMethod;
  /** Dạng OpenAPI, khớp thư mục app/: "/api/workspaces/{workspaceId}" ↔ app/api/workspaces/[workspaceId]/route.ts */
  path: `/api/${string}`;
  /** Tên container (Workspace, Spec...) */
  tags: [string, ...string[]];
  summary: string;
  description?: string;
  request?: Req;
  responses: Res;
  controller: new () => RouteController<Req, Res>;
};

type NextRouteContext = { params: Promise<Record<string, string | string[]>> };

export type RouteDefinition<Req extends RouteRequest = RouteRequest, Res extends RouteResponses = RouteResponses> = RouteSpec<
  Req,
  Res
> & {
  handler: (request: Request, context: NextRouteContext) => Promise<Response>;
};

function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data, { reportInput: true });
  if (!result.success) throw new RequestValidationError(result.error.issues);
  return result.data;
}

function searchParamsToObject(url: URL): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new MalformedJsonError();
  }
}

/**
 * Khai báo một endpoint đúng một lần: vừa tạo handler cho Next.js (validate request, gọi Controller,
 * validate response ở dev/test, đổi lỗi thành ErrorResponse), vừa là nguồn sinh docs/api.json.
 *
 *   // app/api/workspaces/route.ts
 *   export const GET = listWorkspacesRoute.handler;
 */
export function defineRoute<const Req extends RouteRequest = RouteRequest, const Res extends RouteResponses = RouteResponses>(
  spec: RouteSpec<Req, Res>,
): RouteDefinition<Req, Res> {
  const handler = async (request: Request, context: NextRouteContext): Promise<Response> => {
    await connection(); // luôn chạy lúc request, không prerender (cacheComponents)
    try {
      const req: RouteRequest = spec.request ?? {};
      const url = new URL(request.url);
      const input = {
        params: req.params ? parseInput(req.params, await context.params) : {},
        query: req.query ? parseInput(req.query, searchParamsToObject(url)) : {},
        body: req.body ? parseInput(req.body, await readJson(request)) : undefined,
        request,
      } as RouteInput<Req>;

      const output = (await new spec.controller().handle(input)) as Response | { status: SuccessStatus; body?: unknown };
      if (output instanceof Response) return output;

      const def = spec.responses[output.status as SuccessStatus];
      if (def === undefined) throw new Error(`${spec.operationId}: status ${output.status} chưa khai trong responses`);
      if (def === null || output.status === 204) return new Response(null, { status: output.status });

      const schema = def as z.ZodType;
      // Dev/test: bắt Controller trả lệch schema để docs/api.json luôn đúng với thực tế.
      const body = env().NODE_ENV === "production" ? output.body : schema.parse(output.body);
      // API có thể trả bản che / plaintext secret (endpoint reveal): không cho trình duyệt hay proxy cache.
      return Response.json(body, { status: output.status, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toErrorResponse(err);
    }
  };

  return { ...spec, handler };
}
