import "server-only";
import type { PublishTarget } from "@/ship/contracts/enums/sync";
import type { PublishStep } from "@/ship/contracts/events";
import { Task } from "@/ship/parents/Task";
import type { WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";
import { PublishTargetNotConfiguredException } from "../Exceptions/PublishTargetNotConfiguredException";
import { TARGET_ORDER, type PublishTrigger } from "../Models/PublishRun";

export type PlanPublishTargetsInput = {
  /** undefined = Workspace chưa có config.json → chỉ ghi local. */
  config: WorkspaceConfig | undefined;
  trigger: PublishTrigger;
  /** Force Sync / Thử lại một đích: chỉ chạy LOCAL + đích này. */
  only?: PublishTarget;
};

const step = (target: PublishTarget, skipReason?: string): PublishStep => ({
  target,
  status: skipReason ? "SKIPPED" : "PENDING",
  detail: skipReason ?? null,
  url: null,
  error: null,
});

/** Đích Workspace đã cấu hình (spec 6.4: chỉ chạy đích đã cấu hình). */
function configuredTargets(config: WorkspaceConfig | undefined): Set<PublishTarget> {
  const out = new Set<PublishTarget>(["LOCAL"]);
  if (config?.storage.type === "GIT" && config.storage.git) out.add("GIT");
  if (config?.storage.type === "DRIVE" && config.storage.drive) out.add("DRIVE");
  if (config?.nbl.notebookId) out.add("NOTEBOOK");
  return out;
}

/** Lý do bỏ qua một đích khi Approve theo các tuỳ chọn tự động (Force Sync thì luôn chạy). */
function approveSkipReason(target: PublishTarget, config: WorkspaceConfig): string | undefined {
  if (target === "GIT" && !config.storage.git?.autoCommit) return "Tự commit đang tắt";
  if (target === "DRIVE" && !config.storage.drive?.pushOnApprove) return "Tải lên sau khi Approve đang tắt";
  if (target === "NOTEBOOK") {
    if (!config.nbl.autoSyncOnApprove) return "Tự sync NotebookLM đang tắt";
    if (config.nbl.confirmBeforeSync) return "Chờ xác nhận sync NotebookLM";
  }
  return undefined;
}

/** Lập danh sách bước ban đầu (PENDING / SKIPPED) cho một lần chạy pipeline, theo thứ tự LOCAL → GIT → DRIVE → NOTEBOOK. */
export class PlanPublishTargetsTask extends Task<PlanPublishTargetsInput, PublishStep[]> {
  async run({ config, trigger, only }: PlanPublishTargetsInput): Promise<PublishStep[]> {
    const configured = configuredTargets(config);
    if (only && !configured.has(only)) throw new PublishTargetNotConfiguredException({ target: only });
    return TARGET_ORDER.filter((t) => configured.has(t) && (!only || t === "LOCAL" || t === only)).map((t) =>
      step(t, trigger === "APPROVE" && config && t !== "LOCAL" ? approveSkipReason(t, config) : undefined),
    );
  }
}
