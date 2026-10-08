"use client";

import * as React from "react";
import { FileStack, FileText, HardDrive, Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { useForceSyncSpec, useGetWorkspace, useListSpecs } from "@/client/api/generated";
import type { SpecSyncStatus } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { useContextFiles, useDirtyFiles, useOpenFile, useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { useProposalStore } from "@/client/stores/workbench-proposal-store";
import { usePublishStore } from "@/client/stores/workbench-publish-store";
import { EmptyState } from "@/ui/molecules/empty-state";
import { SpecListItem } from "@/ui/molecules/spec-list-item";
import { Button, IconButton } from "@/ui/primitives/button";
import { Checkbox } from "@/ui/primitives/checkbox";
import { Icon } from "@/ui/primitives/icon";
import { ScrollArea } from "@/ui/primitives/scroll-area";
import { Skeleton } from "@/ui/primitives/skeleton";
import { notify } from "@/ui/primitives/sonner";
import { DeleteSpecDialog, NewSpecDialog, RenameSpecDialog } from "./spec-dialogs";

type Dialogs = { kind: "rename"; file: string } | { kind: "delete"; file: string } | null;

type SpecSidebarProps = {
  workspaceId: string;
  collapsed: boolean;
  onExpand: () => void;
  /** Dialog + New spec do màn điều khiển (mở được từ empty state của Editor). */
  newSpecOpen: boolean;
  onNewSpecOpenChange: (open: boolean) => void;
};

/**
 * SpecSidebar.md (spec 3.2): tiêu đề SPECS + chọn tất cả, số spec trong context, + New spec, danh sách SpecListItem.
 * Trạng thái mỗi dòng: nháp chưa lưu → UNSAVED (client), pipeline đang chạy → SYNCING, còn lại theo server.
 */
export function SpecSidebar({ workspaceId, collapsed, onExpand, newSpecOpen, onNewSpecOpenChange }: SpecSidebarProps) {
  const t = useTranslations("workbench.sidebar");
  const errorMessage = useErrorMessage();
  const specs = useListSpecs(workspaceId);
  const workspace = useGetWorkspace(workspaceId);
  const openFile = useOpenFile(workspaceId);
  const context = useContextFiles(workspaceId);
  const dirty = useDirtyFiles(workspaceId);
  const syncingFiles = usePublishStore(useShallow((s) => s.order.filter((id) => !s.runs[id].finished).map((id) => s.runs[id].file)));
  const [dialog, setDialog] = React.useState<Dialogs>(null);

  const items = React.useMemo(() => specs.data?.items ?? [], [specs.data]);

  // Bỏ nháp / context / file mở của file không còn tồn tại (giữ file mới mà Agent đang đề xuất).
  React.useEffect(() => {
    if (!specs.data) return;
    const proposed = useProposalStore.getState().queue.filter((p) => p.workspaceId === workspaceId).map((p) => p.file);
    useWorkbenchEditorStore.getState().pruneFiles(workspaceId, [...specs.data.items.map((i) => i.file), ...proposed]);
  }, [specs.data, workspaceId]);

  const forceSync = useForceSyncSpec();
  const runForceSync = (file: string) =>
    forceSync.mutate(
      { workspaceId, file: specFileParam(file), data: {} },
      {
        onSuccess: (run) => {
          const store = usePublishStore.getState();
          store.ensureRun(run);
          store.openPanel(run.file, run.runId);
        },
        onError: (err) => notify.error(t("forceSyncFailed", { file }), { description: errorMessage(err) }),
      },
    );

  const statusOf = (file: string, server: SpecSyncStatus): SpecSyncStatus =>
    dirty.includes(file) ? "UNSAVED" : syncingFiles.includes(file) ? "SYNCING" : server;

  const { setContextChecked, setContext, openFile: open } = useWorkbenchEditorStore.getState();
  const checkedCount = items.filter((i) => context.includes(i.file)).length;
  const allState = checkedCount === 0 ? false : checkedCount === items.length ? true : "indeterminate";

  const dialogs = (
    <>
      <NewSpecDialog workspaceId={workspaceId} open={newSpecOpen} onOpenChange={onNewSpecOpenChange} />
      <RenameSpecDialog workspaceId={workspaceId} file={dialog?.kind === "rename" ? dialog.file : null} onOpenChange={(o) => !o && setDialog(null)} />
      <DeleteSpecDialog workspaceId={workspaceId} file={dialog?.kind === "delete" ? dialog.file : null} onOpenChange={(o) => !o && setDialog(null)} />
    </>
  );

  if (collapsed) {
    return (
      <nav aria-label={t("label")} className="flex flex-col items-center gap-1 py-2">
        <IconButton icon={FileStack} label={t("expand")} tooltipSide="right" onClick={onExpand} />
        <span className="text-[11px] leading-4 text-muted-foreground" aria-label={t("count", { count: items.length })}>
          {items.length}
        </span>
        {dialogs}
      </nav>
    );
  }

  return (
    <nav aria-label={t("label")} className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 pr-2 pl-4">
        <Checkbox
          tone="quiet"
          checked={allState}
          disabled={items.length === 0}
          label={t("selectAll")}
          onCheckedChange={(v) => setContext(workspaceId, v === true ? items.map((i) => i.file) : [])}
        />
        <span className="text-[11px] leading-4 font-semibold tracking-[.06em] text-muted-foreground uppercase">{t("title")}</span>
        <span className="text-xs leading-4 text-muted-foreground">{checkedCount > 0 ? t("inContext", { count: checkedCount }) : null}</span>
        <span className="flex-1" />
        <IconButton icon={Plus} label={t("newSpec")} size="icon-sm" onClick={() => onNewSpecOpenChange(true)} />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div role="list" aria-busy={specs.isPending || undefined} className="flex flex-col gap-px px-2 pb-2">
          {specs.isPending ? (
            Array.from({ length: 5 }, (_, i) => <Skeleton key={i} shape="row" className="my-0.5" />)
          ) : specs.isError ? (
            <EmptyState
              title={t("loadFailed")}
              description={errorMessage(specs.error)}
              actions={
                <Button size="sm" icon={RefreshCw} onClick={() => void specs.refetch()}>
                  {t("retry")}
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("emptyTitle")}
              description={t("emptyDescription", { dir: workspace.data?.specsDir ?? "./specs" })}
              actions={
                <Button size="sm" variant="primary" icon={Plus} onClick={() => onNewSpecOpenChange(true)}>
                  {t("newSpec")}
                </Button>
              }
            />
          ) : (
            items.map((item) => (
              <div role="listitem" key={item.file}>
                <SpecListItem
                  name={item.file}
                  status={statusOf(item.file, item.syncStatus)}
                  checked={context.includes(item.file)}
                  selected={item.file === openFile}
                  onSelect={() => open(workspaceId, item.file)}
                  onCheckedChange={(checked) => setContextChecked(workspaceId, item.file, checked)}
                  onRename={() => setDialog({ kind: "rename", file: item.file })}
                  onForceSync={() => runForceSync(item.file)}
                  onDelete={() => setDialog({ kind: "delete", file: item.file })}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {workspace.data ? (
        <div className="flex h-9 shrink-0 items-center gap-2 border-t border-border px-4 text-xs leading-4 text-muted-foreground">
          <Icon icon={HardDrive} size="sm" />
          <span className="min-w-0 truncate font-mono" title={workspace.data.path}>
            {workspace.data.storageLabel ?? workspace.data.specsDir}
          </span>
        </div>
      ) : null}
      {dialogs}
    </nav>
  );
}
