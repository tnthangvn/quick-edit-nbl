import { defineConfig } from "orval";

type Spec = { paths?: Record<string, Record<string, { responses?: Record<string, { content?: Record<string, unknown> }> }>> };

/**
 * Bỏ các operation trả text/event-stream khỏi phần sinh hàm fetch/hook (Orval không đọc được SSE).
 * FE mở SSE bằng wrapper EventSource trong src/client/sse; type event vẫn sinh từ components/schemas.
 */
function dropEventStreams<T>(spec: T): T {
  const doc = structuredClone(spec) as Spec;
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const [method, op] of Object.entries(item)) {
      const isSse = Object.values(op.responses ?? {}).some((r) => r.content && "text/event-stream" in r.content);
      if (isSse) delete item[method];
    }
    if (!Object.keys(item).length) delete doc.paths![path];
  }
  return doc as T;
}

/**
 * Sinh client FE từ docs/api.json: hàm fetch, hook TanStack Query, type và enum.
 * Chạy: pnpm api:gen. Không sửa tay thư mục output.
 */
export default defineConfig({
  specStudio: {
    input: { target: "./docs/api.json", override: { transformer: dropEventStreams } },
    output: {
      mode: "tags-split",
      target: "src/client/api/generated",
      schemas: "src/client/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        enumGenerationType: "const",
        fetch: {
          // non-2xx → throw ApiError (err.status, err.info = body lỗi đã có type), hook nhận thẳng data
          forceSuccessResponse: true,
          includeHttpResponseReturnType: false,
        },
        query: { signal: true },
      },
    },
  },
  // Zod schema sinh từ cùng spec: validate form (react-hook-form + zodResolver) và runtime ở FE, không viết tay.
  specStudioZod: {
    input: { target: "./docs/api.json", override: { transformer: dropEventStreams } },
    output: {
      mode: "tags-split",
      target: "src/client/api/generated/zod",
      client: "zod",
      fileExtension: ".zod.ts",
      clean: true,
    },
  },
});
