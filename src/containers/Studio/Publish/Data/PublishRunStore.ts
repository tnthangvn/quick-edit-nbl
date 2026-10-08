import "server-only";
import type { PublishRun } from "../Models/PublishRun";

const fileKey = (workspaceId: string, file: string) => `${workspaceId}\u0000${file}`;

/**
 * Các lần chạy pipeline trong bộ nhớ: lần mới nhất của mỗi file (để FE dựng lại bảng Sync Activity sau khi
 * kết nối lại) và số lần đang chờ / đang chạy theo file. Lần chạy cũ đã xong bị bỏ khi có lần mới hơn.
 */
class PublishRunStore {
  private readonly runs = new Map<string, PublishRun>();
  private readonly latest = new Map<string, string>();
  private readonly active = new Map<string, number>();

  add(run: PublishRun) {
    const k = fileKey(run.workspaceId, run.file);
    const previous = this.latest.get(k);
    if (previous) {
      const prev = this.runs.get(previous);
      if (prev?.finished) this.runs.delete(previous);
    }
    this.runs.set(run.runId, run);
    this.latest.set(k, run.runId);
    this.active.set(k, (this.active.get(k) ?? 0) + 1);
  }

  get(runId: string): PublishRun | undefined {
    return this.runs.get(runId);
  }

  update(runId: string, mutate: (run: PublishRun) => void): PublishRun | undefined {
    const run = this.runs.get(runId);
    if (!run) return undefined;
    mutate(run);
    return run;
  }

  /** Đánh dấu xong, trả số lần chạy khác của cùng file vẫn đang chờ / chạy. */
  finish(runId: string): number {
    const run = this.runs.get(runId);
    if (!run) return 0;
    run.finished = true;
    run.finishedAt = new Date().toISOString();
    const k = fileKey(run.workspaceId, run.file);
    const left = Math.max(0, (this.active.get(k) ?? 1) - 1);
    if (left === 0) this.active.delete(k);
    else this.active.set(k, left);
    // Lần chạy đã bị lần mới hơn thay thế thì không cần giữ.
    if (this.latest.get(k) !== runId) this.runs.delete(runId);
    return left;
  }

  latestFor(workspaceId: string): PublishRun[] {
    const out: PublishRun[] = [];
    for (const runId of this.latest.values()) {
      const run = this.runs.get(runId);
      if (run?.workspaceId === workspaceId) out.push(run);
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

const globalForRuns = globalThis as unknown as { __specStudioPublishRuns?: PublishRunStore };
export const publishRunStore = (globalForRuns.__specStudioPublishRuns ??= new PublishRunStore());
