"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Slot } from "radix-ui";
import type { SpecSyncStatus } from "@/client/api/generated/model";
import { cn } from "@/ui/utils";
import { Icon } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";

/**
 * Badge / tag nhỏ, bo `radius-sm`, icon 12px.
 * - `variant`: màu chung (neutral gray, primary blue nhạt, destructive đỏ nhạt…).
 * - `status`: trạng thái đồng bộ của spec, khớp enum `SpecSyncStatus` (StatusBadge.md).
 * - `compact`: chỉ icon (Sidebar), nhãn đưa vào `aria-label`.
 */
const badgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1 overflow-hidden rounded-sm font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3 [&_code]:font-mono [&_code]:text-[11px]",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary-soft text-primary",
        destructive: "bg-destructive-soft text-destructive",
        outline: "border border-border bg-card text-muted-foreground",
        solid: "bg-primary text-primary-foreground",
        /** Chip trên Header (Git · Drive · NBL): nền muted, chữ đổi theo tiến trình. */
        mutedPrimary: "bg-muted text-primary",
        mutedDestructive: "bg-muted text-destructive",
      },
      size: {
        xs: "h-[18px] px-1.5 text-[11px] leading-4",
        sm: "h-5 px-1.5 text-xs leading-4",
        md: "h-[22px] px-2 text-xs leading-4",
      },
      status: {
        SYNCED: "bg-muted text-muted-foreground",
        UNSAVED: "bg-primary-soft text-primary",
        SYNCING: "bg-primary-soft text-primary",
        ERROR: "bg-destructive-soft text-destructive",
      } satisfies Record<SpecSyncStatus, string>,
      compact: { true: "w-5 justify-center bg-transparent px-0", false: "" },
    },
    defaultVariants: { variant: "neutral", size: "sm", compact: false },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean };

function Badge({ className, variant, size, status, compact, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? undefined}
      data-status={status ?? undefined}
      className={cn(badgeVariants({ variant, size, status, compact }), className)}
      {...props}
    />
  );
}

/** Chấm tròn 8px theo `currentColor` (Unsaved, chip trạng thái). */
function Dot({ className, ...props }: React.ComponentProps<"span">) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full bg-current", className)} {...props} />;
}

const STATUS_ICON: Record<SpecSyncStatus, React.ReactNode> = {
  SYNCED: <Icon icon={Check} size="xs" strokeWidth={2.5} />,
  UNSAVED: <Dot />,
  SYNCING: <Spinner size="xs" />,
  ERROR: <Icon icon={CircleAlert} size="xs" strokeWidth={2.5} />,
};

type StatusBadgeProps = Omit<BadgeProps, "status" | "variant" | "asChild" | "children"> & {
  status: SpecSyncStatus;
  /** Đổi chữ (vd "Chờ duyệt"); mặc định lấy từ `common.status.<STATUS>`. */
  label?: string;
};

/** Trạng thái đồng bộ spec: mỗi trạng thái có icon riêng, không chỉ dựa vào màu. */
function StatusBadge({ status, label, compact, size, className, ...props }: StatusBadgeProps) {
  const t = useTranslations("common.status");
  const text = label ?? t(status);
  return (
    <Badge
      status={status}
      compact={compact}
      size={size}
      role={compact ? "img" : undefined}
      aria-label={compact ? text : undefined}
      title={compact ? text : undefined}
      className={className}
      {...props}
    >
      {STATUS_ICON[status]}
      {compact ? null : <span>{text}</span>}
    </Badge>
  );
}

export { Badge, Dot, StatusBadge, badgeVariants, type BadgeProps, type StatusBadgeProps };
