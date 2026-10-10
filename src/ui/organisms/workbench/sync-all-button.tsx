"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forceSyncSpec,
  useGetWorkspaceConfig,
  useListSpecs,
} from "@/client/api/generated";
import { useContextFiles } from "@/client/stores/workbench-editor-store";
import type { PublishTarget } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { usePublishStore } from "@/client/stores/workbench-publish-store";
import { Button } from "@/ui/primitives/button";
import { notify } from "@/ui/primitives/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/primitives/tooltip";
import { configuredRemoteTargets } from "./sync-targets";

const TARGET_LABEL: Record<PublishTarget, string> = {
  LOCAL: "Local",
  GIT: "Git",
  DRIVE: "Drive",
  NOTEBOOK: "NBL",
};

/**
 * Nút Sync trên Header: chạy pipeline (Force Sync) cho các spec đang tick ở Sidebar lên các đích Workspace đã cấu hình
 * (Git · Drive · NotebookLM). Chưa tick file nào thì khoá. Server xếp hàng theo Workspace nên các file chạy lần lượt.
 * Workspace chỉ Local (không có đích remote) thì ẩn.
 */
export function SyncAllButton({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations("workbench.syncAll");
  const errorMessage = useErrorMessage();
  const config = useGetWorkspaceConfig(workspaceId, {
    query: { retry: false },
  });
  const specs = useListSpecs(workspaceId);
  const [running, setRunning] = React.useState(false);
  const selected = useContextFiles(workspaceId);

  const targets = [...configuredRemoteTargets(config.data)];
  if (targets.length === 0) return null;

  // Chỉ file đang tick còn tồn tại trong danh sách spec.
  const existing = new Set((specs.data?.items ?? []).map((s) => s.file));
  const files = selected.filter((f) => existing.has(f));
  const targetText = targets.map((x) => TARGET_LABEL[x]).join(" · ");

  const syncAll = async () => {
    if (files.length === 0) return;
    setRunning(true);
    let started = 0;
    try {
      for (const file of files) {
        try {
          const run = await forceSyncSpec(workspaceId, specFileParam(file), {});
          const store = usePublishStore.getState();
          store.ensureRun(run);
          if (started === 0) store.openPanel(run.file, run.runId);
          started++;
        } catch (err) {
          notify.error(t("failed", { file }), {
            description: errorMessage(err),
          });
        }
      }
      if (started > 0)
        notify.info(t("started", { count: started, targets: targetText }));
    } finally {
      setRunning(false);
    }
  };

  const label =
    files.length > 0
      ? t("selected", { count: files.length, targets: targetText })
      : t("noneSelected");
  return (
    <Tooltip>
      {/* span: tooltip vẫn hiện khi nút bị khoá (chưa tick file). */}
      <TooltipTrigger asChild>
        <span
          className="inline-flex"
          tabIndex={files.length === 0 ? 0 : undefined}
        >
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={running}
            disabled={running || files.length === 0}
            aria-label={label}
            onClick={() => void syncAll()}
          >
            {t("label")}
            {files.length > 0 ? (
              <span className="text-primary tabular-nums">{files.length}</span>
            ) : null}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
