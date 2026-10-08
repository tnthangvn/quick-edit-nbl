"use client";

import * as React from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FolderOpen, Plus, SearchX, SquareLibrary } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getListWorkspacesQueryKey, useListWorkspaces, useOpenWorkspace } from "@/client/api/generated";
import type { ListWorkspacesParams, Workspace, WorkspaceSort } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { EmptyState } from "@/ui/molecules/empty-state";
import { NewProjectCard, ProjectCard } from "@/ui/molecules/project-card";
import { Button } from "@/ui/primitives/button";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";
import type { StorageFilter } from "@/ui/organisms/projects/ProjectToolbar";
import { EditWorkspaceDialog, RemoveWorkspaceDialog } from "@/ui/organisms/projects/WorkspaceDialogs";

export type ProjectListProps = {
  q: string;
  storage: StorageFilter;
  sort: WorkspaceSort;
  onNewProject: () => void;
  onImport: () => void;
  /** "Sửa cấu hình" → Settings tab Workspace & Storage. */
  onEditConfig: (workspaceId: string) => void;
  /** Bọc lưới thẻ (ProjectsGrid của template). */
  grid: (children: React.ReactNode) => React.ReactNode;
};

type DialogState =
  | { kind: "rename" | "locate" | "remove"; workspace: Workspace }
  | null;

/**
 * Danh sách Workspace (spec 3.0): `listWorkspaces` theo tìm kiếm / lọc / sắp xếp, thẻ ProjectCard, menu thẻ,
 * trạng thái tải / lỗi / trống. Bấm thẻ → `openWorkspace` rồi chuyển sang `/w/<id>`.
 */
export function ProjectList({ q, storage, sort, onNewProject, onImport, onEditConfig, grid }: ProjectListProps) {
  const t = useTranslations("projects.list");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const query = React.useDeferredValue(q.trim());
  const params: ListWorkspacesParams = {
    ...(query ? { q: query } : {}),
    ...(storage !== "ALL" ? { storageType: storage } : {}),
    sort,
  };
  const list = useListWorkspaces(params, { query: { placeholderData: keepPreviousData } });
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [opening, setOpening] = React.useState<string | null>(null);

  const open = useOpenWorkspace({
    mutation: {
      onSuccess: ({ workspace }) => {
        // Next Router Cache có thể giữ nguyên component này khi quay lại "/" (không remount) — phải tự reset,
        // không thì `opening` còn giữ id cũ, lần mở kế tiếp bị chặn im lặng ở `if (opening) return`.
        setOpening(null);
        void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
        router.push(`/w/${workspace.id}`);
      },
      onError: (err) => {
        setOpening(null);
        notify.error(t("openFailed"), { description: errorMessage(err) });
      },
    },
  });

  const openWorkspace = (ws: Workspace) => {
    if (opening) return;
    setOpening(ws.id);
    open.mutate({ workspaceId: ws.id });
  };

  const closeDialog = (next: boolean) => {
    if (!next) setDialog(null);
  };

  let content: React.ReactNode;
  if (list.isPending) {
    content = (
      <div role="status" className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground">
        <Spinner tone="muted" />
        {t("loading")}
      </div>
    );
  } else if (list.isError) {
    content = (
      <EmptyState
        icon={CircleAlert}
        title={t("errorTitle")}
        description={errorMessage(list.error)}
        actions={
          <Button variant="outline" loading={list.isFetching} onClick={() => void list.refetch()}>
            {t("retry")}
          </Button>
        }
      />
    );
  } else {
    const items = list.data.items;
    const filtered = Boolean(query) || storage !== "ALL";
    if (items.length === 0 && !filtered) {
      content = (
        <EmptyState
          size="screen"
          icon={SquareLibrary}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actions={
            <>
              <Button variant="outline" icon={FolderOpen} onClick={onImport}>
                {t("importExisting")}
              </Button>
              <Button variant="primary" icon={Plus} onClick={onNewProject}>
                {t("newProject")}
              </Button>
            </>
          }
        />
      );
    } else {
      content = (
        <>
          {grid(
            <>
              <NewProjectCard onClick={onNewProject} />
              {items.map((ws) => (
                <ProjectCard
                  key={ws.id}
                  workspace={ws}
                  onOpen={() => openWorkspace(ws)}
                  onRename={() => setDialog({ kind: "rename", workspace: ws })}
                  onEditConfig={ws.status === "ACTIVE" ? () => onEditConfig(ws.id) : undefined}
                  onRemove={() => setDialog({ kind: "remove", workspace: ws })}
                  onLocate={() => setDialog({ kind: "locate", workspace: ws })}
                />
              ))}
            </>,
          )}
          {items.length === 0 ? (
            <EmptyState icon={SearchX} title={query ? t("noMatch", { q: query }) : t("noMatchFilter")} description={t("noMatchHint")} />
          ) : null}
        </>
      );
    }
  }

  const ws = dialog?.workspace ?? null;
  return (
    <>
      {content}
      <EditWorkspaceDialog
        open={dialog?.kind === "rename" || dialog?.kind === "locate"}
        mode={dialog?.kind === "locate" ? "locate" : "rename"}
        workspace={ws}
        onOpenChange={closeDialog}
      />
      <RemoveWorkspaceDialog open={dialog?.kind === "remove"} workspace={ws} onOpenChange={closeDialog} />
    </>
  );
}

/** Mô tả dưới tiêu đề "Projects": tổng số project. */
export function ProjectsSummary() {
  const t = useTranslations("projects");
  const list = useListWorkspaces({ sort: "RECENT" });
  if (!list.data) return <>{t("description")}</>;
  return <>{t("count", { count: list.data.items.length })}</>;
}
