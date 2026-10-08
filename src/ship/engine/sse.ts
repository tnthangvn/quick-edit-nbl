import "server-only";
import type { z } from "zod";

export type SseSend<E> = (event: E) => void;

/**
 * Tạo Response text/event-stream. `start` nhận hàm `send` (validate event theo schema rồi gửi)
 * và trả về hàm dọn dẹp khi client ngắt kết nối.
 */
export function sseResponse<S extends z.ZodType>(
  schema: S,
  start: (send: SseSend<z.input<S>>, signal: AbortSignal) => void | (() => void) | Promise<void | (() => void)>,
  request: Request,
): Response {
  const encoder = new TextEncoder();
  let cleanup: void | (() => void);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send: SseSend<z.input<S>> = (event) => {
        const data = schema.parse(event);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 15_000);
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        cleanup?.();
        try {
          controller.close();
        } catch {
          /* đã đóng */
        }
      });
      cleanup = await start(send, request.signal);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
