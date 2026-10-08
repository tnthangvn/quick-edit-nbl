"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useHydrateUiStore, useUiStore } from "@/client/stores/ui-store";
import { SettingsDialog, type SettingsTab } from "@/ui/organisms/settings/SettingsDialog";
import {
  ChatComposer,
  ChatLog,
  ChatToolbar,
  EditorPane,
  SpecSidebar,
  SyncActivityPanel,
  WorkbenchHeader,
  WorkbenchSession,
} from "@/ui/organisms/workbench";
import { WorkbenchTemplate } from "@/ui/templates/workbench-template";

/**
 * Màn Workbench: ghép WorkbenchTemplate với các organism. Chỉ giữ state giao diện của màn (sidebar thu gọn, Settings
 * Dialog đang mở); dữ liệu do từng organism tự lấy.
 */
export function WorkbenchScreen({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  useHydrateUiStore();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [settings, setSettings] = React.useState<{ open: boolean; tab?: SettingsTab }>({ open: false });
  const [newSpecOpen, setNewSpecOpen] = React.useState(false);

  const openSettings = React.useCallback((tab?: SettingsTab) => setSettings({ open: true, tab }), []);

  return (
    <div className="h-dvh">
      <WorkbenchSession workspaceId={workspaceId} />
      <WorkbenchTemplate
        collapsed={collapsed}
        header={
          <WorkbenchHeader
            workspaceId={workspaceId}
            sidebarCollapsed={collapsed}
            onToggleSidebar={toggleSidebar}
            onOpenSettings={() => openSettings()}
            onNewProject={() => router.push("/")}
          />
        }
        sidebar={<SpecSidebar workspaceId={workspaceId} collapsed={collapsed} onExpand={toggleSidebar} newSpecOpen={newSpecOpen} onNewSpecOpenChange={setNewSpecOpen} />}
        editor={<EditorPane workspaceId={workspaceId} onCreateSpec={() => setNewSpecOpen(true)} />}
        chatLog={<ChatLog workspaceId={workspaceId} />}
        toolbar={<ChatToolbar workspaceId={workspaceId} onOpenSettings={openSettings} />}
        composer={<ChatComposer workspaceId={workspaceId} />}
        overlay={<SyncActivityPanel workspaceId={workspaceId} />}
      />
      <SettingsDialog open={settings.open} onOpenChange={(open) => setSettings((s) => ({ ...s, open }))} workspaceId={workspaceId} initialTab={settings.tab} />
    </div>
  );
}
