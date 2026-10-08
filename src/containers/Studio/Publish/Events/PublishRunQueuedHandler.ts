import "server-only";
import { logger } from "@/ship/adapters/logger";
import { eventBus } from "@/ship/engine/eventBus";
import { ExecutePublishRunAction } from "../Actions/ExecutePublishRunAction";

/** Sự kiện nội bộ của container Publish (chỉ trên bus, không ra SSE). */
export const PUBLISH_RUN_QUEUED = "Publish.RunQueued";
export type PublishRunQueuedPayload = { runId: string; workspaceId: string; file: string };

type HandlerState = { registered: boolean; tails: Map<string, Promise<void>> };
const globalForHandler = globalThis as unknown as { __specStudioPublishHandler?: HandlerState };
const state = (globalForHandler.__specStudioPublishHandler ??= { registered: false, tails: new Map() });

/**
 * Đăng ký (một lần cho cả tiến trình) handler chạy pipeline. Hàng đợi theo file: lần chạy sau nối vào
 * promise của lần trước nên Approve tiếp theo trên cùng file được xếp hàng, file khác chạy song song.
 */
export function ensurePublishRunHandler() {
  if (state.registered) return;
  state.registered = true;
  eventBus.on<PublishRunQueuedPayload>(PUBLISH_RUN_QUEUED, ({ runId, workspaceId, file }) => {
    const key = `${workspaceId}\u0000${file}`;
    const tail = (state.tails.get(key) ?? Promise.resolve())
      .then(() => new ExecutePublishRunAction().run({ runId }))
      .catch((err: unknown) => logger.error({ err, runId }, "pipeline publish lỗi ngoài dự kiến"));
    state.tails.set(key, tail);
    void tail.then(() => {
      if (state.tails.get(key) === tail) state.tails.delete(key);
    });
  });
}
