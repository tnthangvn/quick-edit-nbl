"use client";

import * as React from "react";
import { Check, CircleAlert, Code, Eye, FileText, GitCompareArrows, MousePointerClick, Plus, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGetSpec, useListSpecs } from "@/client/api/generated";
import type { SpecSyncStatus } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useFlash } from "@/client/hooks/use-flash";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { useDraft, useOpenFile, useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { useProposalStore, type Proposal } from "@/client/stores/workbench-proposal-store";
import { usePublishStore } from "@/client/stores/workbench-publish-store";
import { useUiStore, type EditorView } from "@/client/stores/ui-store";
import { EmptyState } from "@/ui/molecules/empty-state";
import { Markdown } from "@/ui/molecules/markdown";
import { Shortcut } from "@/ui/molecules/shortcut";
import { Badge, StatusBadge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { ResizeHandle } from "@/ui/primitives/resize-handle";
import { Segmented, SegmentedItem } from "@/ui/primitives/segmented";
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
    <div className="relative flex h-full max-w-[50%] min-w-24 items-center gap-1.5 border-r border-border bg-card px-3 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary">
      <Icon icon={FileText} size="sm" tone="primary" />
      <span className="truncate font-mono text-xs leading-4 text-foreground">{file}</span>
    </div>
  );
}

type ViewMode = EditorView;

/**
 * Chế độ xem. Editor thường: Edit (chỉ editor) | Diff (Edit trái + diff bản nháp ↔ đã lưu phải) | Preview (Edit trái + preview phải),
 * kéo thanh giữa để đổi độ rộng.
 * khi duyệt đề xuất: Diff | Preview (nguồn chính là Diff).
 */
function ViewToggle({
  value,
  onChange,
  modes,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  modes: readonly ViewMode[];
}) {
  const t = useTranslations("workbench.editor");
  const meta: Record<ViewMode, { icon: LucideIcon; label: string }> = {
    SOURCE: { icon: Code, label: t("source") },
    DIFF: { icon: GitCompareArrows, label: t("diff") },
    PREVIEW: { icon: Eye, label: t("preview") },
  };
  return (
    <Segmented size="sm" value={value} onValueChange={(v) => onChange(v as ViewMode)} aria-label={t("viewMode")}>
      {modes.map((m) => (
        <SegmentedItem key={m} value={m}>
          <Icon icon={meta[m].icon} />
          {meta[m].label}
        </SegmentedItem>
      ))}
    </Segmented>
  );
}

const SPLIT_MIN_PX = 240;

/** Editor bên trái + panel phụ bên phải (preview / diff) khi có `side`; độ rộng cột trái theo % (nhớ trong ui-store), kéo thanh giữa để đổi. */
function SplitLayout({ side, sideLabel, children }: { side: React.ReactNode; sideLabel: string; children: React.ReactNode }) {
  const t = useTranslations("workbench.editor");
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const ratio = useUiStore((s) => s.editorSplitRatio);
  const setRatio = useUiStore((s) => s.setEditorSplitRatio);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const split = side !== null && width > 0;
  const leftPx = Math.round(width * ratio);
  return (
    <div ref={ref} className="absolute inset-0 flex">
      <div className="relative h-full min-w-0" style={{ width: split ? leftPx : "100%" }}>
        {children}
      </div>
      {split ? (
        <>
          <ResizeHandle
            value={leftPx}
            min={SPLIT_MIN_PX}
            max={Math.max(SPLIT_MIN_PX, width - SPLIT_MIN_PX)}
            onValueChange={(px) => setRatio(px / width)}
            label={t("splitResize")}
          />
          <section aria-label={sideLabel} className="relative h-full min-w-0 flex-1 overflow-auto bg-editor">
            {side}
          </section>
        </>
      ) : null}
    </div>
  );
}

/** Preview phủ lên Monaco (Monaco vẫn mount để giữ undo / phần đang sửa). */
function PreviewLayer({ content, label }: { content: string; label: string }) {
  return (
    <div role="document" aria-label={label} className="absolute inset-0 z-10 overflow-auto bg-editor">
      <Markdown variant="document">{content}</Markdown>
    </div>
  );
}

/** Panel phải ở chế độ Diff: bản nháp ↔ file đã lưu (inline, chỉ xem, cập nhật khi gõ). Chưa sửa gì thì báo không có thay đổi. */
function DraftDiffPane({ workspaceId, file, saved, draft, dirty }: { workspaceId: string; file: string; saved: string; draft: string; dirty: boolean }) {
  const t = useTranslations("workbench.editor");
  const modifiedRef = React.useRef<(() => string) | null>(null);
  const [stats, setStats] = React.useState<DiffStats | null>(null);
  const [instanceId] = React.useState(() => `draft-${Date.now()}`);
  if (!dirty) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState icon={GitCompareArrows} title={t("diffNoChanges")} />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-6 shrink-0 items-center gap-2 border-b border-border bg-muted px-3 text-[11px] leading-6 font-semibold tracking-[.06em] text-muted-foreground uppercase">
        <span className="flex-1">{t("diffTitle")}</span>
        {stats ? (
          <span className="font-mono tracking-normal normal-case">
            <span className="text-primary">+{stats.added}</span> <span className="text-destructive">−{stats.removed}</span>
          </span>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1">
        <SpecMonacoDiff
          workspaceId={workspaceId}
          file={file}
          original={saved}
          proposed={draft}
          instanceId={instanceId}
          modifiedRef={modifiedRef}
          onStats={setStats}
          ariaLabel={t("diffLabel", { file })}
          readOnly
          inline
        />
      </div>
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
  // Lưu ở ui-store: đổi file (component tạo lại theo key) vẫn giữ chế độ xem.
  const view = useUiStore((s) => s.editorView);
  const setView = useUiStore((s) => s.setEditorView);

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
    body = (
      <>
        <SplitLayout
          side={
            view === "PREVIEW" ? (
              <Markdown variant="document">{value}</Markdown>
            ) : view === "DIFF" ? (
              <DraftDiffPane workspaceId={workspaceId} file={file} saved={saved_ ?? ""} draft={value} dirty={dirty} />
            ) : null
          }
          sideLabel={view === "DIFF" ? t("diffLabel", { file }) : t("previewLabel", { file })}
        >
          <SpecMonacoEditor workspaceId={workspaceId} file={file} value={value} onChange={onChange} ariaLabel={t("editorLabel", { file })} />
        </SplitLayout>
      </>
    );
  }

  return (
    <Frame label={t("label")}>
      <TabBar>
        <FileTab file={file} />
        <StatusBadge status={status} />
        <span className="flex-1" />
        <ViewToggle value={view} onChange={setView} modes={["SOURCE", "DIFF", "PREVIEW"]} />
        <PendingProposals workspaceId={workspaceId} file={file} />
        {dirty ? <span className="hidden text-xs leading-4 text-muted-foreground lg:inline">{t("draftHint")}</span> : null}
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
  // Preview: nội dung bên Proposed lúc chuyển (gồm cả phần người dùng đã sửa trong DiffEditor).
  const [preview, setPreview] = React.useState<string | null>(null);
  const changeView = (v: ViewMode) => setPreview(v === "PREVIEW" ? (modifiedRef.current?.() ?? proposal.proposed) : null);
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
        <ViewToggle value={preview === null ? "DIFF" : "PREVIEW"} onChange={changeView} modes={["DIFF", "PREVIEW"]} />
        <Button variant="secondary" size="sm" icon={X} disabled={saving} onClick={reject}>
          {t("reject")}
        </Button>
        <Button variant="primary" size="sm" icon={Check} loading={saving} loadingText={t("saving")} onClick={() => void approve()} aria-keyshortcuts="Control+S Meta+S">
          {t("approveSave")}
          <Shortcut keys={["mod", "S"]} surface="inverse" className="ml-1" />
        </Button>
      </div>
      {preview === null ? (
        <div className="grid shrink-0 grid-cols-2 border-b border-border bg-muted text-[11px] leading-6 font-semibold tracking-[.06em] text-muted-foreground uppercase">
          <span className="px-3">{t("original")}</span>
          <span className="border-l border-border px-3">
            {t("proposed")} <span className="font-normal tracking-normal normal-case">· {t("editable")}</span>
          </span>
        </div>
      ) : null}
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
        {preview !== null ? <PreviewLayer content={preview} label={t("previewOf", { file: proposal.file })} /> : null}
      </div>
    </Frame>
  );
}
