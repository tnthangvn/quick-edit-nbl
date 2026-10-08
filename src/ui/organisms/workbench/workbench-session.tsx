"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getGetStorageStatusQueryKey, getListSpecsQueryKey, useListPublishRuns, useOpenWorkspace } from "@/client/api/generated";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useCliRunStream } from "@/client/hooks/use-cli-run";
import { useWorkspaceEvents } from "@/client/hooks/use-workspace-events";
import { useHydrateCliRunStore } from "@/client/stores/workbench-cli-store";
import { useHydrateWorkbenchEditorStore, useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { useActiveProposal } from "@/client/stores/workbench-proposal-store";
import { usePublishStore } from "@/client/stores/workbench-publish-store";
import { notify } from "@/ui/primitives/sonner";

/**
 * Phần "không hiển thị" của Workbench, gắn một lần cho mỗi Workspace:
 * mở Workspace (`openWorkspace`: pullOnOpen…), nghe SSE Workspace + run CLI, khôi phục Sync Activity từ
 * `listPublishRuns` sau khi tải lại, tự mở file của đề xuất đang đứng đầu hàng (Diff mode).
 */
export function WorkbenchSession({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations("workbench.toast");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();

  useHydrateWorkbenchEditorStore();
  useHydrateCliRunStore();

  useEffect(() => {
    usePublishStore.getState().reset(workspaceId);
  }, [workspaceId]);

  // openWorkspace một lần mỗi Workspace (StrictMode chạy effect hai lần).
  const { mutate: open } = useOpenWorkspace();
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (opened.current === workspaceId) return;
    opened.current = workspaceId;
    open(
      { workspaceId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
          void queryClient.invalidateQueries({ queryKey: getGetStorageStatusQueryKey(workspaceId) });
        },
        onError: (err) => notify.error(t("openFailed"), { description: errorMessage(err) }),
      },
    );
  }, [workspaceId, open, queryClient, t, errorMessage]);

  useWorkspaceEvents(workspaceId);
  useCliRunStream(workspaceId);

  const runs = useListPublishRuns(workspaceId, { query: { staleTime: Infinity, refetchOnWindowFocus: false } });
  useEffect(() => {
    if (runs.data) usePublishStore.getState().seedRuns(runs.data.items);
  }, [runs.data]);

  // Đề xuất mới lên đầu hàng → mở file đó (Workspace chuyển sang DiffView).
  const { active } = useActiveProposal(workspaceId);
  const activeKey = active?.key;
  const activeFile = active?.file;
  useEffect(() => {
    if (activeKey && activeFile) useWorkbenchEditorStore.getState().openFile(workspaceId, activeFile);
  }, [activeKey, activeFile, workspaceId]);

  return null;
}
