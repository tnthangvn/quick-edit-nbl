"use client";

import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { useGetWorkspace, useGetWorkspaceConfig } from "@/client/api/generated";
import type { PublishStepStatus, PublishTarget, WorkspaceConfigOutput } from "@/client/api/generated/model";
import { headerSteps, usePublishStore } from "@/client/stores/workbench-publish-store";
import { SyncChip } from "@/ui/molecules/sync-target-row";
import { AppHeader } from "@/ui/organisms/app-header";
import { WorkspaceSwitcher } from "@/ui/organisms/workspace/WorkspaceSwitcher";
import { StorageStatus } from "./storage-status";

const REMOTE_TARGETS: PublishTarget[] = ["GIT", "DRIVE", "NOTEBOOK"];

/** Đích remote Workspace đã cấu hình (khớp cách BE lập pipeline 6.4). Chưa có config.json → không có đích remote. */
export function configuredRemoteTargets(config: WorkspaceConfigOutput | undefined): Set<PublishTarget> {
  const out = new Set<PublishTarget>();
  if (!config) return out;
  if (config.storage.git) out.add("GIT");
  if (config.storage.drive) out.add("DRIVE");
  if (config.nbl.notebookId) out.add("NOTEBOOK");
  return out;
}

/** Chip Git · Drive · NBL trên Header (spec 3.3.1): đổi màu theo tiến trình, kể cả khi bảng Sync Activity thu gọn. */
function SyncChips({ workspaceId }: { workspaceId: string }) {
  const config = useGetWorkspaceConfig(workspaceId, { query: { retry: false } });
  const steps = usePublishStore(useShallow(headerSteps));
  const configured = configuredRemoteTargets(config.data);
  const targets = REMOTE_TARGETS.filter((target) => configured.has(target) || steps[target]);
  if (targets.length === 0) return null;
  return (
    <>
      {targets.map((target) => (
        <SyncChip key={target} target={target} status={(steps[target]?.status ?? "PENDING") as PublishStepStatus} />
      ))}
    </>
  );
}

type WorkbenchHeaderProps = {
  workspaceId: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onNewProject: () => void;
};

/** AppHeader của Workbench (spec 3.1): Workspace Switcher, Storage Status, chip đồng bộ, Settings. */
export function WorkbenchHeader({ workspaceId, sidebarCollapsed, onToggleSidebar, onOpenSettings, onNewProject }: WorkbenchHeaderProps) {
  const workspace = useGetWorkspace(workspaceId);
  return (
    <AppHeader
      sidebar={{ collapsed: sidebarCollapsed, onToggle: onToggleSidebar }}
      workspaceSwitcher={<WorkspaceSwitcher currentWorkspaceId={workspaceId} onNewProject={onNewProject} />}
      path={workspace.data?.path}
      storageStatus={<StorageStatus workspaceId={workspaceId} />}
      syncChips={<SyncChips workspaceId={workspaceId} />}
      onOpenSettings={onOpenSettings}
    />
  );
}
