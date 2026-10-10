"use client";

import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { useGetWorkspace, useGetWorkspaceConfig } from "@/client/api/generated";
import type { PublishStepStatus } from "@/client/api/generated/model";
import { headerSteps, usePublishStore } from "@/client/stores/workbench-publish-store";
import { SyncChip } from "@/ui/molecules/sync-target-row";
import { AppHeader } from "@/ui/organisms/app-header";
import { WorkspaceSwitcher } from "@/ui/organisms/workspace/WorkspaceSwitcher";
import { StorageStatus } from "./storage-status";
import { configuredRemoteTargets, REMOTE_TARGETS } from "./sync-targets";
import { SyncAllButton } from "./sync-all-button";

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

/** AppHeader của Workbench (spec 3.1): Workspace Switcher, nút Sync, Storage Status, chip đồng bộ, Settings. */
export function WorkbenchHeader({ workspaceId, sidebarCollapsed, onToggleSidebar, onOpenSettings, onNewProject }: WorkbenchHeaderProps) {
  const workspace = useGetWorkspace(workspaceId);
  return (
    <AppHeader
      sidebar={{ collapsed: sidebarCollapsed, onToggle: onToggleSidebar }}
      workspaceSwitcher={<WorkspaceSwitcher currentWorkspaceId={workspaceId} onNewProject={onNewProject} />}
      path={workspace.data?.path}
      storageStatus={
        <>
          <SyncAllButton workspaceId={workspaceId} />
          <StorageStatus workspaceId={workspaceId} />
        </>
      }
      syncChips={<SyncChips workspaceId={workspaceId} />}
      onOpenSettings={onOpenSettings}
    />
  );
}
