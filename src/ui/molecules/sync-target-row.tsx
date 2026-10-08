"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { BookOpen, Check, CircleAlert, CircleSlash, Clock, Cloud, ExternalLink, GitBranch, HardDrive, RefreshCw, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublishStepError, PublishStepStatus, PublishTarget } from "@/client/api/generated/model";
import { cn } from "@/ui/utils";
import { Badge, Dot, type BadgeProps } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";
import { useErrorText } from "@/ui/molecules/use-error-text";

/**
 * Một đích trong bảng Sync Activity (spec 3.3.1): icon, tên, chi tiết bước (mono), trạng thái Chờ / Đang chạy / Xong / Lỗi.
 * Dòng lỗi nền đỏ nhạt kèm lý do và nút Thử lại.
 */
const TARGET_ICON: Record<PublishTarget, LucideIcon> = {
  LOCAL: HardDrive,
  GIT: GitBranch,
  DRIVE: Cloud,
  NOTEBOOK: BookOpen,
};

const syncTargetRowVariants = cva(
  "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md p-2 transition-[background-color,opacity] duration-(--duration-slow) ease-out",
  {
    variants: {
      status: {
        PENDING: "opacity-55",
        RUNNING: "bg-primary-soft",
        DONE: "",
        ERROR: "bg-destructive-soft",
        SKIPPED: "opacity-55",
      } satisfies Record<PublishStepStatus, string>,
    },
    defaultVariants: { status: "PENDING" },
  },
);

const targetIconVariants = cva("grid size-7 place-items-center rounded-md", {
  variants: {
    status: {
      PENDING: "bg-muted text-muted-foreground",
      RUNNING: "bg-card text-primary",
      DONE: "bg-card text-primary",
      ERROR: "bg-card text-destructive",
      SKIPPED: "bg-muted text-muted-foreground",
    } satisfies Record<PublishStepStatus, string>,
  },
});

const stepStatusVariants = cva("inline-flex items-center gap-1 text-xs whitespace-nowrap", {
  variants: {
    status: {
      PENDING: "text-muted-foreground",
      RUNNING: "text-primary",
      DONE: "text-primary",
      ERROR: "text-destructive",
      SKIPPED: "text-muted-foreground",
    } satisfies Record<PublishStepStatus, string>,
  },
});

const STEP_ICON: Record<PublishStepStatus, React.ReactNode> = {
  PENDING: <Icon icon={Clock} size="xs" />,
  RUNNING: <Spinner size="xs" />,
  DONE: <Icon icon={Check} size="xs" strokeWidth={2.5} />,
  ERROR: <Icon icon={CircleAlert} size="xs" strokeWidth={2.5} />,
  SKIPPED: <Icon icon={CircleSlash} size="xs" />,
};

type SyncTargetRowProps = {
  target: PublishTarget;
  status: PublishStepStatus;
  /** Ghi đè tên đích (vd "Git · Pull Request"). */
  label?: string;
  /** Chi tiết bước hiện tại, mono (vd `git push origin main…`). */
  detail?: string | null;
  error?: PublishStepError | string;
  url?: string | null;
  urlLabel?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

function SyncTargetRow({ target, status, label, detail, error, url, urlLabel, onRetry, retrying, className }: SyncTargetRowProps) {
  const t = useTranslations("common");
  const errorText = useErrorText(error);
  const line = errorText ?? detail;
  return (
    <div data-slot="sync-target-row" data-status={status} className={cn(syncTargetRowVariants({ status }), className)}>
      <span className={targetIconVariants({ status })}>
        <Icon icon={TARGET_ICON[target]} size="sm" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] leading-[18px] font-medium">{label ?? t(`publish.target.${target}`)}</div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 font-mono text-[11px] leading-4 text-primary underline-offset-2 hover:underline"
          >
            <span className="truncate">{urlLabel ?? detail ?? url}</span>
            <ExternalLink className="size-3 shrink-0" aria-label={t("actions.openUrl")} />
          </a>
        ) : line ? (
          <span className="block truncate font-mono text-[11px] leading-4 text-muted-foreground in-data-[status=ERROR]:text-destructive" title={line}>
            {line}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className={stepStatusVariants({ status })}>
          {STEP_ICON[status]}
          {t(`publish.step.${status}`)}
        </span>
        {status === "ERROR" && onRetry ? (
          <Button variant="outline" size="sm" icon={RefreshCw} loading={retrying} onClick={onRetry}>
            {t("actions.retry")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Chip trạng thái từng đích trên Header (Git · Drive · NBL), đổi màu theo tiến trình kể cả khi bảng đã thu gọn. */
const CHIP_VARIANT: Record<PublishStepStatus, NonNullable<BadgeProps["variant"]>> = {
  PENDING: "neutral",
  RUNNING: "mutedPrimary",
  DONE: "mutedPrimary",
  ERROR: "mutedDestructive",
  SKIPPED: "neutral",
};

function SyncChip({ target, status, className }: { target: PublishTarget; status: PublishStepStatus; className?: string }) {
  const t = useTranslations("common.publish");
  const name = t(`targetShort.${target}`);
  return (
    <Badge
      variant={CHIP_VARIANT[status]}
      size="xs"
      title={t("chip", { target: name, status: t(`step.${status}`) })}
      aria-label={t("chip", { target: name, status: t(`step.${status}`) })}
      className={className}
    >
      {status === "RUNNING" ? <Spinner size="xs" className="size-2.5" /> : <Dot className="size-1.5" />}
      {name}
    </Badge>
  );
}

export { SyncChip, SyncTargetRow, syncTargetRowVariants, type SyncTargetRowProps };
