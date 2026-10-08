import "server-only";
import { Task } from "@/ship/parents/Task";
import { cliRunStore, type CliRunStore } from "../Data/Stores/CliRunStore";

/** Bỏ run vừa giữ chỗ khi chuẩn bị thất bại (chưa có tiến trình nào chạy). */
export class DiscardCliRunTask extends Task<{ runId: string }> {
  constructor(private readonly store: CliRunStore = cliRunStore) {
    super();
  }

  async run({ runId }: { runId: string }): Promise<void> {
    this.store.remove(runId);
  }
}
