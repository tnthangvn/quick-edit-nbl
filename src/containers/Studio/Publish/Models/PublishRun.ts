import type { PublishTarget } from "@/ship/contracts/enums/sync";
import type { PublishStep } from "@/ship/contracts/events";

/** Pipeline chạy do Approve & Save hay do Force Sync / Thử lại. */
export type PublishTrigger = "APPROVE" | "FORCE";

/** Một lần chạy pipeline 6.4 cho một file (giữ trong bộ nhớ tiến trình). */
export type PublishRun = {
  runId: string;
  workspaceId: string;
  file: string;
  trigger: PublishTrigger;
  /** Động từ cho mẫu commit message ({action}). */
  action: "add" | "update";
  steps: PublishStep[];
  finished: boolean;
  createdAt: string;
  finishedAt: string | null;
};

/** Thứ tự cố định: LOCAL luôn đầu tiên (điều kiện tiên quyết), rồi Git → Drive → NotebookLM. */
export const TARGET_ORDER: readonly PublishTarget[] = ["LOCAL", "GIT", "DRIVE", "NOTEBOOK"];
