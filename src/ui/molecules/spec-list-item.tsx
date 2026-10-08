"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Ellipsis, FileText, Pencil, RefreshCw, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SpecSyncStatus } from "@/client/api/generated/model";
import { cn } from "@/ui/utils";
import { StatusBadge } from "@/ui/primitives/badge";
import { IconButton } from "@/ui/primitives/button";
import { Checkbox } from "@/ui/primitives/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/primitives/dropdown-menu";
import { Icon } from "@/ui/primitives/icon";

/**
 * SpecListItem.md: checkbox → icon file → tên → trạng thái → menu 3 chấm.
 * Click dòng = mở file (`selected`: nền `sidebar-accent` + vạch `primary` bên trái). Checkbox = thêm vào context, độc lập.
 * Menu 3 chấm chỉ hiện khi hover / đang chọn / focus.
 */
const specListItemVariants = cva(
  "group/row relative flex h-(--size-row) items-center gap-2 rounded-md pr-1 pl-2 text-[13px] leading-[18px] font-medium text-sidebar-foreground transition-colors duration-(--duration-fast) ease-out",
  {
    variants: {
      selected: {
        true: "bg-sidebar-accent before:absolute before:top-1.5 before:bottom-1.5 before:-left-2 before:w-[3px] before:rounded-full before:bg-primary",
        false: "hover:bg-accent",
      },
    },
    defaultVariants: { selected: false },
  },
);

type SpecListItemProps = VariantProps<typeof specListItemVariants> & {
  name: string;
  status: SpecSyncStatus;
  checked: boolean;
  onSelect?: () => void;
  onCheckedChange?: (checked: boolean) => void;
  onRename?: () => void;
  onForceSync?: () => void;
  onDelete?: () => void;
  className?: string;
};

function SpecListItem({ name, status, checked, selected, onSelect, onCheckedChange, onRename, onForceSync, onDelete, className }: SpecListItemProps) {
  const t = useTranslations("common");
  const hasMenu = Boolean(onRename || onForceSync || onDelete);
  return (
    <div data-slot="spec-list-item" data-selected={selected || undefined} className={cn(specListItemVariants({ selected }), className)}>
      <Checkbox
        tone="quiet"
        checked={checked}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        label={t("spec.addToContext", { name })}
      />
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left focus-visible:outline-offset-2"
      >
        <Icon icon={FileText} className="text-muted-foreground group-data-selected/row:text-primary" />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <StatusBadge status={status} compact />
      </button>
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              icon={Ellipsis}
              label={t("spec.menu", { name })}
              size="icon-sm"
              tooltip={false}
              className="opacity-0 group-hover/row:opacity-100 group-data-selected/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRename ? (
              <DropdownMenuItem onSelect={onRename}>
                <Pencil />
                {t("actions.rename")}
              </DropdownMenuItem>
            ) : null}
            {onForceSync ? (
              <DropdownMenuItem onSelect={onForceSync}>
                <RefreshCw />
                {t("actions.forceSync")}
              </DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="destructive" onSelect={onDelete}>
                  <Trash />
                  {t("actions.deleteSpec")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export { SpecListItem, specListItemVariants, type SpecListItemProps };
