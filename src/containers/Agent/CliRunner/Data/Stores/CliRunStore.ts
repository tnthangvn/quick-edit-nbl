import "server-only";
import { v7 as uuidv7 } from "uuid";
import type { CliRunStatus } from "../../Enums/CliRunStatus";
import type { CliRunEvent, CliRunEventDraft } from "../../Events/CliRunEvent";

export type CliRunListener = (event: CliRunEvent) => void;

/** Giới hạn bộ đệm để một run nói nhiều không ăn hết bộ nhớ. LOG vượt ngưỡng vẫn gửi live nhưng không lưu để phát lại. */
const MAX_BUFFERED_LOGS = 2_000;
const MAX_TEXT = 4_000;
/** Số run giữ lại trong bộ nhớ (run đã kết thúc cũ nhất bị bỏ trước). */
const MAX_RUNS = 50;

const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text);

/** Một lần chạy CLI agent: trạng thái, bộ đệm event để phát lại cho client vào muộn, nút dừng. */
export class CliRun {
  readonly events: CliRunEvent[] = [];
  readonly abort = new AbortController();
  status: CliRunStatus = "RUNNING";
  private readonly listeners = new Set<CliRunListener>();
  private seq = 0;
  private bufferedLogs = 0;

  constructor(
    readonly id: string,
    readonly workspaceId: string,
  ) {}

  get active(): boolean {
    return this.status === "RUNNING";
  }

  push(draft: CliRunEventDraft): void {
    this.emit(this.prepare(draft));
  }

  /** Gắn runId / seq / at cho event mà chưa phát (để lưu trước rồi mới phát, vd STATUS kết thúc). */
  prepare(draft: CliRunEventDraft): CliRunEvent {
    const event = { ...draft, runId: this.id, seq: this.seq++, at: new Date().toISOString() } as CliRunEvent;
    if (event.type === "LOG" || event.type === "MESSAGE") event.text = clip(event.text);
    return event;
  }

  /** Phát event đã `prepare`. */
  emit(event: CliRunEvent): void {
    if (event.type === "STATUS") this.status = event.status;

    const buffer = event.type !== "LOG" || this.bufferedLogs++ < MAX_BUFFERED_LOGS;
    if (buffer) this.events.push(event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // client SSE đã đóng: bỏ listener, không làm hỏng run.
        this.listeners.delete(listener);
      }
    }
  }

  /** Phát lại event đã có rồi nghe tiếp, đồng bộ trong cùng một tick nên không sót / trùng event. */
  subscribe(listener: CliRunListener): () => void {
    for (const event of this.events) listener(event);
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Registry run trong bộ nhớ tiến trình (không cần repository). Mỗi workspace tối đa một run đang chạy. */
export class CliRunStore {
  private readonly runs = new Map<string, CliRun>();

  /** Tạo run mới; undefined nếu workspace đang có run chạy dở. */
  create(workspaceId: string): CliRun | undefined {
    for (const run of this.runs.values()) if (run.workspaceId === workspaceId && run.active) return undefined;
    const run = new CliRun(uuidv7(), workspaceId);
    this.runs.set(run.id, run);
    this.prune();
    return run;
  }

  get(runId: string): CliRun | undefined {
    return this.runs.get(runId);
  }

  remove(runId: string): void {
    this.runs.delete(runId);
  }

  private prune() {
    for (const [id, run] of this.runs) {
      if (this.runs.size <= MAX_RUNS) break;
      if (!run.active) this.runs.delete(id);
    }
  }
}

// Giữ registry qua hot reload của Next dev. Chính file này được nạp lại thì class đổi: bỏ registry cũ, vì run tạo từ
// class cũ thiếu method mới (vd `prepare`) và sẽ hỏng giữa chừng.
const globalForRuns = globalThis as unknown as { __specStudioCliRuns?: CliRunStore };
if (!(globalForRuns.__specStudioCliRuns instanceof CliRunStore)) globalForRuns.__specStudioCliRuns = new CliRunStore();
export const cliRunStore = globalForRuns.__specStudioCliRuns;
