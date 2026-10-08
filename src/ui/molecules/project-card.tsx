"use client";

import * as React from "react";
import Link from "next/link";
import { Cloud, Ellipsis, FileText, FolderOpen, FolderX, GitBranch, Pencil, Plus, Settings2, Trash, type LucideIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import type { SpecSyncStatus, StorageType, Workspace } from "@/client/api/generated/model";
import { cn } from "@/ui/utils";
import { Badge, StatusBadge } from "@/ui/primitives/badge";
import { Button, IconButton } from "@/ui/primitives/button";
import { Card, CardFooter, CardTitle } from "@/ui/primitives/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/primitives/dropdown-menu";
import { Icon } from "@/ui/primitives/icon";

/**
 * Thẻ Workspace trên màn Projects (spec 3.0): tên, đường dẫn, badge nơi lưu, đích NotebookLM, số spec, lần mở gần nhất,
 * trạng thái tổng. Cả thẻ là link mở Workspace; menu 3 chấm: Mở thư mục, Đổi tên, Sửa cấu hình, Gỡ khỏi danh sách.
 * `status = FOLDER_MISSING`: thẻ mờ, badge "Không tìm thấy thư mục", hành động Tìm lại / Gỡ khỏi danh sách.
 */
const STORAGE_ICON: Record<StorageType, LucideIcon> = { LOCAL: FileText, GIT: GitBranch, DRIVE: Cloud };

type ProjectCardProps = {
  workspace: Workspace;
  specCount?: number;
  /** Trạng thái tổng: SYNCED / UNSAVED (có thay đổi chưa push) / SYNCING / ERROR. */
  syncStatus?: SpecSyncStatus;
  /** Tên notebook rút gọn; mặc định hiện `notebookId`. */
  notebookLabel?: string;
  href?: string;
  onOpen?: () => void;
  onOpenFolder?: () => void;
  onRename?: () => void;
  onEditConfig?: () => void;
  onRemove?: () => void;
  onLocate?: () => void;
  className?: string;
};

function ProjectCard({
  workspace,
  specCount,
  syncStatus,
  notebookLabel,
  href,
  onOpen,
  onOpenFolder,
  onRename,
  onEditConfig,
  onRemove,
  onLocate,
  className,
}: ProjectCardProps) {
  const t = useTranslations("common");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const missing = workspace.status === "FOLDER_MISSING";
  const opened = workspace.lastOpenedAt ? format.relativeTime(new Date(workspace.lastOpenedAt), now) : t("workspace.neverOpened");
  const notebook = workspace.notebookId ? t("workspace.notebook", { name: notebookLabel ?? workspace.notebookId }) : t("workspace.notebookNone");
  const openLabel = t("workspace.open", { name: workspace.name });
  const stretched = "outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']";

  return (
    <Card data-slot="project-card" interactive dimmed={missing} className={cn("min-h-44", className)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <CardTitle>
            {href ? (
              <Link href={href} aria-label={openLabel} className={stretched}>
                {workspace.name}
              </Link>
            ) : (
              <button type="button" onClick={onOpen} aria-label={openLabel} className={cn("cursor-pointer text-left", stretched)}>
                {workspace.name}
              </button>
            )}
          </CardTitle>
          <p className="m-0 truncate font-mono text-xs leading-4 text-muted-foreground" title={workspace.path}>
            {workspace.path}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton icon={Ellipsis} size="icon-sm" label={t("workspace.menu", { name: workspace.name })} tooltip={false} className="relative z-10" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onOpenFolder ? (
              <DropdownMenuItem onSelect={onOpenFolder}>
                <FolderOpen />
                {t("actions.openFolder")}
              </DropdownMenuItem>
            ) : null}
            {onRename ? (
              <DropdownMenuItem onSelect={onRename}>
                <Pencil />
                {t("actions.rename")}
              </DropdownMenuItem>
            ) : null}
            {onEditConfig ? (
              <DropdownMenuItem onSelect={onEditConfig}>
                <Settings2 />
                {t("actions.editConfig")}
              </DropdownMenuItem>
            ) : null}
            {onRemove ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="destructive" onSelect={onRemove}>
                  <Trash />
                  {t("actions.removeFromList")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge size="md">
          <Icon icon={STORAGE_ICON[workspace.storageType]} size="xs" />
          <span>{t(`storage.${workspace.storageType}`)}</span>
          {workspace.storageLabel ? <code className="truncate">{workspace.storageLabel}</code> : null}
        </Badge>
        <Badge size="md" variant={workspace.notebookId ? "primary" : "neutral"}>
          <span className="truncate">{notebook}</span>
        </Badge>
        {missing ? (
          <Badge size="md" variant="destructive">
            <Icon icon={FolderX} size="xs" />
            {t("workspace.folderMissing")}
          </Badge>
        ) : null}
      </div>

      {missing && (onLocate || onRemove) ? (
        <div className="relative z-10 flex gap-2">
          {onLocate ? (
            <Button variant="outline" size="sm" icon={FolderOpen} onClick={onLocate}>
              {t("actions.locate")}
            </Button>
          ) : null}
          {onRemove ? (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              {t("actions.removeFromList")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <CardFooter>
        {specCount !== undefined ? (
          <>
            <span>{t("workspace.specCount", { count: specCount })}</span>
            <span aria-hidden>·</span>
          </>
        ) : null}
        <span className="truncate">{opened}</span>
        <span className="flex-1" />
        {syncStatus ? <StatusBadge status={syncStatus} label={t(`workspace.status.${syncStatus}`)} /> : null}
      </CardFooter>
    </Card>
  );
}

/** Ô "+ New Project" nét đứt ở đầu lưới. */
function NewProjectCard({ onClick, className }: { onClick?: () => void; className?: string }) {
  const t = useTranslations("common");
  return (
    <Card asChild variant="dashed" className={cn("group/new min-h-44 w-full gap-2", className)}>
      <button type="button" onClick={onClick}>
        <Icon icon={Plus} size="lg" className="transition-transform duration-(--duration-slow) ease-out group-hover/new:rotate-90" />
        <span className="text-[13px] font-medium">{t("actions.newProject")}</span>
        <span className="text-xs">{t("workspace.newProjectHint")}</span>
      </button>
    </Card>
  );
}

export { NewProjectCard, ProjectCard, type ProjectCardProps };
