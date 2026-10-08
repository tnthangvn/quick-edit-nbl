"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, CircleAlert, CircleCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { useForceSyncSpec, useGetWorkspaceConfig } from "@/client/api/generated";
import type { PublishTarget } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { panelRunning, panelSteps, summarizeSteps, usePublishStore } from "@/client/stores/workbench-publish-store";
import { SyncTargetRow } from "@/ui/molecules/sync-target-row";
import { IconButton } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Progress } from "@/ui/primitives/progress";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";

const AUTO_COLLAPSE_MS = 5000;

/**
 * Bảng Sync Activity (spec 3.3.1) góc dưới phải sau Approve & Save / Force Sync: đầu bảng `Đang đồng bộ <file>` +
 * `n/N nơi`, thanh tiến độ, Thu gọn / Đóng (khoá khi đang chạy); mỗi đích một SyncTargetRow, lỗi có Thử lại
 * (`forceSyncSpec` với `target`). Xong hết thì tự thu gọn sau 5 giây; có lỗi thì giữ nguyên.
 */
export function SyncActivityPanel({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations("workbench.sync");
  const errorMessage = useErrorMessage();
  const panel = usePublishStore((s) => s.panel);
  const steps = usePublishStore(useShallow(panelSteps));
  const running = usePublishStore(panelRunning);
  const config = useGetWorkspaceConfig(workspaceId, { query: { retry: false } });
  const retry = useForceSyncSpec();
  const [retrying, setRetrying] = React.useState<PublishTarget | null>(null);

  const summary = summarizeSteps(steps, running);
  const collapsed = panel?.collapsed ?? false;

  // Tự thu gọn 5 giây sau khi xong không lỗi.
  const allOk = Boolean(panel) && !running && summary.errors === 0 && steps.length > 0;
  React.useEffect(() => {
    if (!allOk) return;
    const timer = setTimeout(() => usePublishStore.getState().setCollapsed(true), AUTO_COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [allOk, panel?.baseRunId]);

  if (!panel) return null;
  const file = panel.file;

  const onRetry = (target: PublishTarget) => {
    setRetrying(target);
    retry.mutate(
      { workspaceId, file: specFileParam(file), data: { target } },
      {
        onSuccess: (run) => usePublishStore.getState().addRetry(target, run),
        onError: (err) => notify.error(t("retryFailed"), { description: errorMessage(err) }),
        onSettled: () => setRetrying(null),
      },
    );
  };

  const title = running
    ? t.rich("running", { file, code: (c) => <code className="font-mono text-xs">{c}</code> })
    : summary.errors > 0
      ? t("withErrors", { done: summary.done, total: summary.total, errors: summary.errors })
      : t.rich("done", { file, code: (c) => <code className="font-mono text-xs">{c}</code> });
  const progress = summary.total === 0 ? (running ? 0 : 100) : (summary.settled / summary.total) * 100;
  const gitLabel = config.data?.storage.git?.publishMode === "PULL_REQUEST" ? t("gitPullRequest") : undefined;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={t("label")}
      className="w-[380px] max-w-[calc(100vw-48px)] animate-slide-in overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-popover"
    >
      <div className="flex items-center gap-2 py-2 pr-2 pl-3.5">
        {running ? (
          <Spinner size="sm" tone="primary" />
        ) : summary.errors > 0 ? (
          <Icon icon={CircleAlert} size="sm" tone="destructive" />
        ) : (
          <Icon icon={CircleCheck} size="sm" tone="primary" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-semibold">
          {title}
          {running && summary.total > 0 ? (
            <span className="ml-1.5 font-normal text-muted-foreground">{t("progress", { done: summary.settled, total: summary.total })}</span>
          ) : null}
        </span>
        <IconButton
          icon={collapsed ? ChevronUp : ChevronDown}
          label={collapsed ? t("expand") : t("collapse")}
          size="icon-sm"
          onClick={() => usePublishStore.getState().setCollapsed(!collapsed)}
        />
        <IconButton icon={X} label={t("close")} size="icon-sm" disabled={running} onClick={() => usePublishStore.getState().closePanel()} />
      </div>
      <Progress value={progress} tone={summary.errors > 0 ? "destructive" : "primary"} label={t("label")} />
      {collapsed ? null : (
        <div className="flex flex-col gap-1 p-2">
          {steps.length === 0 ? (
            <p className="m-0 flex items-center gap-2 px-2 py-1.5 text-xs leading-4 text-muted-foreground">
              <Spinner size="xs" />
              {t("waiting")}
            </p>
          ) : (
            steps.map((step) => (
              <SyncTargetRow
                key={step.target}
                target={step.target}
                status={step.status}
                label={step.target === "GIT" ? gitLabel : undefined}
                detail={step.detail}
                error={step.error ?? undefined}
                url={step.url}
                onRetry={() => onRetry(step.target)}
                retrying={retrying === step.target}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
