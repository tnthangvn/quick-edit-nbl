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
        notify.info(t("pulled", { count: r.files.length }));
        refresh();
      },
      onError: (err) => notify.error(t("pullFailed"), { description: errorMessage(err) }),
    },
  });
  const push = usePushWorkspace({
    mutation: {
      onSuccess: (r) => {
        const pr = r.pullRequest;
        notify.info(r.pushed ? t("pushed", { count: r.files.length }) : t("nothingToPush"), {
          action: pr ? { label: t("openPr", { number: pr.number }), onClick: () => window.open(pr.url, "_blank", "noopener") } : undefined,
        });
        refresh();
      },
      onError: (err) => notify.error(t("pushFailed"), { description: errorMessage(err) }),
    },
  });

  const s = status.data;
  if (!s || s.storageType === "LOCAL") return null;

  const pending = s.storageType === "GIT" ? s.uncommitted + (s.ahead ?? 0) : s.pendingFiles;
  const busy = pull.isPending || push.isPending;
  const summary =
    s.storageType === "GIT"
      ? t("gitSummary", { branch: s.currentBranch ?? s.branch ?? "—", uncommitted: s.uncommitted, ahead: s.ahead ?? 0, behind: s.behind ?? 0 })
      : t("driveSummary", { count: s.pendingFiles });

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("label")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={pending > 0 ? "primary" : "neutral"} size="sm" tabIndex={0} aria-label={summary}>
            {s.storageType === "GIT" ? <Icon icon={GitBranch} size="xs" /> : null}
            {s.storageType === "GIT" && (s.currentBranch ?? s.branch) ? <code>{s.currentBranch ?? s.branch}</code> : null}
            <span>{t("pending", { count: pending })}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{summary}</TooltipContent>
      </Tooltip>
      <Button variant="ghost" size="sm" icon={ArrowDownToLine} loading={pull.isPending} disabled={busy} onClick={() => pull.mutate({ workspaceId })}>
        {t("pull")}
      </Button>
      <Button variant="ghost" size="sm" icon={CloudUpload} loading={push.isPending} disabled={busy || pending === 0} onClick={() => push.mutate({ workspaceId })}>
        {t("push")}
      </Button>
    </div>
  );
}
