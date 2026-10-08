"use client";

import * as React from "react";
import { Check, CircleAlert, FileText, GitCompareArrows, MousePointerClick, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGetSpec, useListSpecs } from "@/client/api/generated";
import type { SpecSyncStatus } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useFlash } from "@/client/hooks/use-flash";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { useDraft, useOpenFile, useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { useProposalStore, type Proposal } from "@/client/stores/workbench-proposal-store";
import { usePublishStore } from "@/client/stores/workbench-publish-store";
import { EmptyState } from "@/ui/molecules/empty-state";
import { Shortcut } from "@/ui/molecules/shortcut";
import { Badge, StatusBadge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Skeleton } from "@/ui/primitives/skeleton";
import { notify } from "@/ui/primitives/sonner";
import { SpecMonacoDiff, SpecMonacoEditor, type DiffStats } from "./monaco";
import { useSaveSpec } from "./use-save-spec";

/** Khung Editor / Diff: viền `border`, `radius-lg`, nền `card`, tab bar `muted` ở trên. */
function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section aria-label={label} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      {children}
    </section>
  );
}

function TabBar({ children }: { children: React.ReactNode }) {
  return <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-muted pr-2">{children}</div>;
}

/** Tab file đang mở: vạch trên `primary` (EditorPane.md). */
function FileTab({ file }: { file: string }) {
  return (
    <div className="relative flex h-full max-w-[50%] min-w-0 items-center gap-1.5 border-r border-border bg-card px-3 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary">
      <Icon icon={FileText} size="sm" tone="primary" />
      <span className="truncate font-mono text-xs leading-4 text-foreground">{file}</span>
    </div>
  );
}

/** Ctrl/Cmd+S trong Workbench (kể cả khi focus trong Monaco). */
function useSaveShortcut(onSave: () => void, enabled: boolean) {
  const handler = React.useEffectEvent((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (enabled) onSave();
    }
  });
  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => handler(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
}

type EditorPaneProps = { workspaceId: string; onCreateSpec: () => void };

/**
 * Workspace trung tâm (spec 3.3): Editor Markdown, hoặc DiffView khi file đang mở có đề xuất của Agent.
 * Trống: chưa có spec / chưa chọn spec (Empty.dc.html).
 */
export function EditorPane({ workspaceId, onCreateSpec }: EditorPaneProps) {
  const t = useTranslations("workbench.editor");
  const openFile = useOpenFile(workspaceId);
  const specs = useListSpecs(workspaceId);
  const proposal = useProposalStore((s) => (openFile ? (s.queue.find((p) => p.workspaceId === workspaceId && p.file === openFile) ?? null) : null));

  if (proposal) return <DiffView key={proposal.key} workspaceId={workspaceId} proposal={proposal} />;

  if (!openFile) {
    const empty = specs.isSuccess && specs.data.items.length === 0;
    return (
      <Frame label={t("label")}>
        <div className="grid flex-1 place-items-center">
          {empty ? (
            <EmptyState
              icon={FileText}
              title={t("noSpecsTitle")}
              description={t("noSpecsDescription")}
              actions={
                <Button variant="primary" icon={Plus} onClick={onCreateSpec}>
                  {t("newSpec")}
                </Button>
              }
            />
          ) : (
            <EmptyState icon={MousePointerClick} title={t("noSelectionTitle")} description={t("noSelectionDescription")} />
          )}
        </div>
      </Frame>
    );
  }

  return <SpecEditor key={openFile} workspaceId={workspaceId} file={openFile} />;
}

/** Nút chuyển sang đề xuất đang chờ của file khác. */
function PendingProposals({ workspaceId, file }: { workspaceId: string; file: string }) {
  const t = useTranslations("workbench.editor");
  const others = useProposalStore((s) => s.queue.filter((p) => p.workspaceId === workspaceId && p.file !== file).length);
  if (others === 0) return null;
  const show = () => {
    const first = useProposalStore.getState().queue.find((p) => p.workspaceId === workspaceId && p.file !== file);
    if (!first) return;
    useProposalStore.getState().focus(first.key);
    useWorkbenchEditorStore.getState().openFile(workspaceId, first.file);
  };
  return (
    <Button variant="tonal" size="sm" icon={GitCompareArrows} onClick={show}>
      {t("pendingProposals", { count: others })}
    </Button>
  );
}

function SpecEditor({ workspaceId, file }: { workspaceId: string; file: string }) {
  const t = useTranslations("workbench.editor");
  const errorMessage = useErrorMessage();
  const spec = useGetSpec(workspaceId, specFileParam(file), { query: { retry: false } });
  const draft = useDraft(workspaceId, file);
  const syncing = usePublishStore((s) => s.order.some((id) => s.runs[id].file === file && !s.runs[id].finished));
  const { save, saving } = useSaveSpec(workspaceId);
  const [saved, flashSaved] = useFlash();

  const saved_ = spec.data?.content;
  const dirty = draft !== undefined && draft !== saved_;
  const value = draft ?? saved_ ?? "";
  const status: SpecSyncStatus = dirty ? "UNSAVED" : syncing ? "SYNCING" : (spec.data?.syncStatus ?? "SYNCED");

  const onChange = React.useCallback(
    (v: string) => useWorkbenchEditorStore.getState().setDraft(workspaceId, file, v, spec.data?.content),
    [workspaceId, file, spec.data?.content],
  );

  const doSave = React.useCallback(async () => {
    if (!dirty || saving || draft === undefined) return;
    const result = await save(file, draft);
    if (result) flashSaved();
  }, [dirty, saving, draft, save, file, flashSaved]);

  useSaveShortcut(() => void doSave(), dirty && !saving);

  let body: React.ReactNode;
  if (spec.isPending) {
    body = (
      <div className="flex flex-col gap-2.5 bg-editor p-4" aria-busy>
        {[60, 85, 40, 72, 55, 90, 30].map((w, i) => (
          <Skeleton key={i} style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  } else if (spec.isError) {
    body = (
      <div className="grid flex-1 place-items-center">
        <EmptyState icon={CircleAlert} title={t("loadFailed", { file })} description={errorMessage(spec.error)} />
      </div>
    );
  } else {
    body = <SpecMonacoEditor workspaceId={workspaceId} file={file} value={value} onChange={onChange} ariaLabel={t("editorLabel", { file })} />;
  }

  return (
    <Frame label={t("label")}>
      <TabBar>
        <FileTab file={file} />
        <StatusBadge status={status} />
        <span className="flex-1" />
        <PendingProposals workspaceId={workspaceId} file={file} />
        <span className="hidden text-xs leading-4 text-muted-foreground lg:inline">{dirty ? t("draftHint") : t("markdown")}</span>
        <Button
          variant="primary"
          size="sm"
          icon={Check}
          disabled={!dirty && !saved}
          loading={saving}
          loadingText={t("saving")}
          success={saved}
          successText={t("saved")}
          onClick={() => void doSave()}
          aria-keyshortcuts="Control+S Meta+S"
        >
          {t("approveSave")}
          <Shortcut keys={["mod", "S"]} surface="inverse" className="ml-1" />
        </Button>
      </TabBar>
      <div className="relative min-h-0 flex-1">{body}</div>
    </Frame>
  );
}

/** DiffView + DiffReviewBar (spec 3.3, 6.1): Original | Proposed, Reject / Approve & Save. */
function DiffView({ workspaceId, proposal }: { workspaceId: string; proposal: Proposal }) {
  const t = useTranslations("workbench.diff");
  const { save, saving } = useSaveSpec(workspaceId);
  const [stats, setStats] = React.useState<DiffStats | null>(null);
  const modifiedRef = React.useRef<(() => string) | null>(null);
  const index = useProposalStore((s) => s.queue.filter((p) => p.workspaceId === workspaceId).findIndex((p) => p.key === proposal.key));
  const total = useProposalStore((s) => s.queue.filter((p) => p.workspaceId === workspaceId).length);
  const isNewFile = proposal.original === "";

  const approve = React.useCallback(async () => {
    if (saving) return;
    const content = modifiedRef.current?.() ?? proposal.proposed;
    const result = await save(proposal.file, content);
    if (result) {
      useWorkbenchEditorStore.getState().clearDraft(workspaceId, proposal.file);
      useProposalStore.getState().resolve(proposal.key);
    }
  }, [saving, save, proposal, workspaceId]);

  const reject = () => {
    useProposalStore.getState().resolve(proposal.key);
    notify.info(t("rejected", { file: proposal.file }));
  };

  useSaveShortcut(() => void approve(), !saving);

  return (
    <Frame label={t("label")}>
      <div role="toolbar" aria-label={t("toolbar")} className="relative z-10 flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card pr-2 pl-3 shadow-float">
        <Icon icon={GitCompareArrows} size="sm" tone="primary" />
        <span className="min-w-0 truncate text-[13px] leading-[18px] font-medium">
          {t.rich(isNewFile ? "titleNew" : "title", { file: proposal.file, code: (chunks) => <code className="font-mono text-xs">{chunks}</code> })}
        </span>
        {stats ? (
          <span className="font-mono text-xs whitespace-nowrap" aria-label={t("stats", { added: stats.added, removed: stats.removed })}>
            <span className="text-primary">+{stats.added}</span> <span className="text-destructive">−{stats.removed}</span>
          </span>
        ) : null}
        {total > 1 ? (
          <Badge variant="outline" size="sm">
            {t("queue", { index: index + 1, total })}
          </Badge>
        ) : null}
        <span className="flex-1" />
        <Button variant="secondary" size="sm" icon={X} disabled={saving} onClick={reject}>
          {t("reject")}
        </Button>
        <Button variant="primary" size="sm" icon={Check} loading={saving} loadingText={t("saving")} onClick={() => void approve()} aria-keyshortcuts="Control+S Meta+S">
          {t("approveSave")}
          <Shortcut keys={["mod", "S"]} surface="inverse" className="ml-1" />
        </Button>
      </div>
      <div className="grid shrink-0 grid-cols-2 border-b border-border bg-muted text-[11px] leading-6 font-semibold tracking-[.06em] text-muted-foreground uppercase">
        <span className="px-3">{t("original")}</span>
        <span className="border-l border-border px-3">{t("proposed")}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <SpecMonacoDiff
          workspaceId={workspaceId}
          file={proposal.file}
          original={proposal.original}
          proposed={proposal.proposed}
          instanceId={String(proposal.receivedAt)}
          modifiedRef={modifiedRef}
          onStats={setStats}
          ariaLabel={t("editorLabel", { file: proposal.file })}
        />
      </div>
    </Frame>
  );
}
