"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Cloud, FileText, GitBranch, LayoutGrid, Plus, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getListWorkspacesQueryKey, useGetWorkspace, useListWorkspaces, useOpenWorkspace } from "@/client/api/generated";
import type { StorageType } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";
import { Icon } from "@/ui/primitives/icon";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";

export type WorkspaceSwitcherProps = {
  /** Workspace đang mở; không có = đang ở màn Projects. */
  currentWorkspaceId?: string;
  /** Mở Wizard + New Project (do màn chứa nó quản lý). */
  onNewProject?: () => void;
};

const STORAGE_ICON: Record<StorageType, LucideIcon> = { LOCAL: FileText, GIT: GitBranch, DRIVE: Cloud };
const RECENT_LIMIT = 6;

/** Local luôn ngầm định có; dùng loại đầu tiên khác Local làm đại diện (icon đơn), LOCAL nếu không có gì khác. */
const primaryStorageType = (types: readonly StorageType[]): StorageType => types.find((t) => t !== "LOCAL") ?? "LOCAL";
/** Ẩn "Local" khỏi badge liệt kê khi có thêm Git/Drive. */
const nonLocalStorageTypes = (types: readonly StorageType[]): StorageType[] => (types.length > 1 ? types.filter((t) => t !== "LOCAL") : [...types]);

/**
 * Workspace Switcher trên Header (spec 3.1): tên Workspace hiện tại + badge nơi lưu; dropdown Workspace gần đây,
 * `+ New Project` và `Tất cả projects…` (về màn Projects).
 */
export function WorkspaceSwitcher({ currentWorkspaceId, onNewProject }: WorkspaceSwitcherProps) {
  const t = useTranslations("workspaceSwitcher");
  const tc = useTranslations("common");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const current = useGetWorkspace(currentWorkspaceId ?? "", { query: { enabled: Boolean(currentWorkspaceId) } });
  const recent = useListWorkspaces({ sort: "RECENT" }, { query: { enabled: menuOpen || !currentWorkspaceId } });
  const open = useOpenWorkspace({
    mutation: {
      onSuccess: ({ workspace }) => {
        void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
        router.push(`/w/${workspace.id}`);
      },
      onError: (err) => notify.error(t("openFailed"), { description: errorMessage(err) }),
    },
  });

  const ws = current.data;
  const items = (recent.data?.items ?? []).slice(0, RECENT_LIMIT);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-1 max-w-[320px] min-w-0 gap-2" aria-label={t("trigger", { name: ws?.name ?? t("allProjects") })}>
          {currentWorkspaceId && current.isPending ? (
            <Spinner size="sm" tone="muted" />
          ) : (
            <span className="min-w-0 truncate">{ws?.name ?? t("projects")}</span>
          )}
          {ws
            ? (() => {
                const types = nonLocalStorageTypes(ws.storageTypes);
                return (
                  <Badge size="xs" variant={types.length === 1 && types[0] === "LOCAL" ? "neutral" : "primary"}>
                    {types.map((t) => (
                      <Icon key={t} icon={STORAGE_ICON[t]} size="xs" />
                    ))}
                    {types.map((t) => tc(`storage.${t}`)).join(" + ")}
                  </Badge>
                );
              })()
            : null}
          <Icon icon={ChevronsUpDown} size="sm" tone="muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px]">
        <DropdownMenuLabel>{t("recent")}</DropdownMenuLabel>
        {recent.isPending ? (
          <DropdownMenuItem disabled>
            <Spinner size="sm" />
            {t("loading")}
          </DropdownMenuItem>
        ) : recent.isError ? (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void recent.refetch();
            }}
          >{t("loadFailed")}</DropdownMenuItem>
        ) : items.length === 0 ? (
          <DropdownMenuItem disabled>{t("empty")}</DropdownMenuItem>
        ) : (
          items.map((item) => {
            const isCurrent = item.id === currentWorkspaceId;
            return (
              <DropdownMenuItem
                key={item.id}
                disabled={item.status === "FOLDER_MISSING"}
                onSelect={() => {
                  if (!isCurrent) open.mutate({ workspaceId: item.id });
                }}
              >
                <Icon icon={isCurrent ? Check : STORAGE_ICON[primaryStorageType(item.storageTypes)]} tone={isCurrent ? "primary" : "muted"} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{item.name}</span>
                  <span className="truncate font-mono text-[11px] leading-4 text-muted-foreground">{item.storageLabel ?? item.path}</span>
                </span>
                {item.status === "FOLDER_MISSING" ? (
                  <Badge size="xs" variant="destructive">
                    {tc("workspace.folderMissing")}
                  </Badge>
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        {onNewProject ? (
          <DropdownMenuItem onSelect={onNewProject}>
            <Plus />
            {tc("actions.newProject")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => router.push("/")}>
          <LayoutGrid />
          {t("allProjects")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
