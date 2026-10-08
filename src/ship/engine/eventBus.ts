import "server-only";
import { EventEmitter } from "node:events";

/**
 * Bus sự kiện trong tiến trình. Dùng để giao tiếp giữa các Section (vd Agent → Studio)
 * và đẩy sự kiện ra SSE. Tên event dạng "<Container>.<Event>", payload khai trong ship/contracts/events.ts.
 */
type Listener<T> = (payload: T) => void;

class EventBus {
  private readonly emitter = new EventEmitter({ captureRejections: true });

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  emit<T>(name: string, payload: T) {
    this.emitter.emit(name, payload);
  }

  on<T>(name: string, listener: Listener<T>): () => void {
    this.emitter.on(name, listener);
    return () => this.emitter.off(name, listener);
  }
}

// Giữ một instance qua hot reload của Next dev.
const globalForBus = globalThis as unknown as { __specStudioBus?: EventBus };
export const eventBus = (globalForBus.__specStudioBus ??= new EventBus());
