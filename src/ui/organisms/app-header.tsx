"use client";

import * as React from "react";
import { PanelLeft, Settings } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/utils";
import { IconButton } from "@/ui/primitives/button";

/**
 * AppHeader.md: cao `size-header`, nền `sidebar`. Trái: (nút thu gọn sidebar) dấu § trên ô `primary` + "Spec Studio",
 * slot Workspace Switcher hoặc đường dẫn mono. Phải: slot Storage Status, chip đồng bộ, `children`, nút Settings.
 * Dấu § là chữ (Geist Mono), không phải logo. Chỉ nhận props/slot — không gọi hook dữ liệu.
 */
type AppHeaderProps = {
  /** Có thì hiện nút `panel-left` bật/tắt sidebar. */
  sidebar?: { collapsed: boolean; onToggle: () => void };
  /** Workspace Switcher (dropdown) đặt cạnh tên app. */
  workspaceSwitcher?: React.ReactNode;
  /** Đường dẫn workspace dạng mono khi không có switcher. */
  path?: string;
  storageStatus?: React.ReactNode;
  syncChips?: React.ReactNode;
  onOpenSettings?: () => void;
  children?: React.ReactNode;
  className?: string;
};

function AppHeader({ sidebar, workspaceSwitcher, path, storageStatus, syncChips, onOpenSettings, children, className }: AppHeaderProps) {
  const t = useTranslations("common");
  return (
    <header
      data-slot="app-header"
      className={cn("flex h-(--size-header) min-w-0 items-center gap-2 border-b border-border bg-sidebar pr-2 pl-4 data-sidebar:pl-2", className)}
      data-sidebar={sidebar ? "" : undefined}
    >
      {sidebar ? (
        <IconButton icon={PanelLeft} label={t("actions.toggleSidebar")} active={!sidebar.collapsed} onClick={sidebar.onToggle} />
      ) : null}
      <Link href="/" aria-label={t("actions.backToProjects")} className="flex shrink-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span aria-hidden className="inline-grid size-[22px] shrink-0 place-items-center rounded-sm bg-primary font-mono text-sm leading-none font-semibold text-primary-foreground">
          §
        </span>
        <span className="text-sm leading-5 font-semibold whitespace-nowrap">{t("appName")}</span>
      </Link>
      {workspaceSwitcher}
      {path && !workspaceSwitcher ? <span className="ml-2 min-w-0 truncate font-mono text-xs leading-[18px] text-muted-foreground">{path}</span> : null}
      <span className="flex-1" />
      {storageStatus}
      {syncChips ? <div className="flex items-center gap-1">{syncChips}</div> : null}
      {children}
      {onOpenSettings ? <IconButton icon={Settings} label={t("actions.settings")} onClick={onOpenSettings} /> : null}
    </header>
  );
}

export { AppHeader, type AppHeaderProps };
