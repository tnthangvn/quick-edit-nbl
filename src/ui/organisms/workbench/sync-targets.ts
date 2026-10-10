import type { PublishTarget, WorkspaceConfigOutput } from "@/client/api/generated/model";

export const REMOTE_TARGETS: PublishTarget[] = ["GIT", "DRIVE", "NOTEBOOK"];

/** Đích remote Workspace đã cấu hình (khớp cách BE lập pipeline 6.4). Chưa có config.json → không có đích remote. */
export function configuredRemoteTargets(config: WorkspaceConfigOutput | undefined): Set<PublishTarget> {
  const out = new Set<PublishTarget>();
  if (!config) return out;
  if (config.storage.git) out.add("GIT");
  if (config.storage.drive) out.add("DRIVE");
  if (config.nbl.notebookId) out.add("NOTEBOOK");
  return out;
}
