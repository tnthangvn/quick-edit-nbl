"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, CloudUpload, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { getGetStorageStatusQueryKey, getListSpecsQueryKey, useGetStorageStatus, usePullWorkspace, usePushWorkspace } from "@/client/api/generated";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { notify } from "@/ui/primitives/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/primitives/tooltip";

/**
 * Storage Status trên Header (spec 3.1): Workspace Git/Drive hiện số thay đổi chưa push/upload + nút Pull / Push nhanh.
 * Workspace Local thì ẩn.
 */
export function StorageStatus({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations("workbench.storage");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const status = useGetStorageStatus(workspaceId);

  const refresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getGetStorageStatusQueryKey(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
    // Nội dung từng file có thể đổi sau khi pull.
    void queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith(`/api/workspaces/${workspaceId}/specs/`) });
  }, [queryClient, workspaceId]);

  const pull = usePullWorkspace({
    mutation: {
      onSuccess: (r) => {
        notify.info(t("pulled", { count: r.items.reduce((n, item) => n + item.files.length, 0) }));
        refresh();
      },
      onError: (err) => notify.error(t("pullFailed"), { description: errorMessage(err) }),
    },
  });
  const push = usePushWorkspace({
    mutation: {
      onSuccess: (r) => {
        const pushed = r.items.some((item) => item.pushed);
        const pr = r.items.find((item) => item.pullRequest)?.pullRequest;
        notify.info(pushed ? t("pushed", { count: r.items.reduce((n, item) => n + item.files.length, 0) }) : t("nothingToPush"), {
          action: pr ? { label: t("openPr", { number: pr.number }), onClick: () => window.open(pr.url, "_blank", "noopener") } : undefined,
        });
        refresh();
      },
      onError: (err) => notify.error(t("pushFailed"), { description: errorMessage(err) }),
    },
  });

  const items = status.data?.items ?? [];
  if (items.length === 0) return null;

  const pendingOf = (item: (typeof items)[number]) => (item.storageType === "GIT" ? item.uncommitted + (item.ahead ?? 0) : item.pendingFiles);
  const summaryOf = (item: (typeof items)[number]) =>
    item.storageType === "GIT"
      ? t("gitSummary", { branch: item.currentBranch ?? item.branch ?? "—", uncommitted: item.uncommitted, ahead: item.ahead ?? 0, behind: item.behind ?? 0 })
      : t("driveSummary", { count: item.pendingFiles });
  const totalPending = items.reduce((n, item) => n + pendingOf(item), 0);
  const busy = pull.isPending || push.isPending;

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("label")}>
      {items.map((item) => {
        const pending = pendingOf(item);
        const summary = summaryOf(item);
        return (
          <Tooltip key={item.storageType}>
            <TooltipTrigger asChild>
              <Badge variant={pending > 0 ? "primary" : "neutral"} size="sm" tabIndex={0} aria-label={summary}>
                {item.storageType === "GIT" ? <Icon icon={GitBranch} size="xs" /> : null}
                {item.storageType === "GIT" && (item.currentBranch ?? item.branch) ? <code>{item.currentBranch ?? item.branch}</code> : null}
                <span>{t("pending", { count: pending })}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{summary}</TooltipContent>
          </Tooltip>
        );
      })}
      <Button variant="ghost" size="sm" icon={ArrowDownToLine} loading={pull.isPending} disabled={busy} onClick={() => pull.mutate({ workspaceId })}>
        {t("pull")}
      </Button>
      <Button variant="ghost" size="sm" icon={CloudUpload} loading={push.isPending} disabled={busy || totalPending === 0} onClick={() => push.mutate({ workspaceId })}>
        {t("push")}
      </Button>
    </div>
  );
}
