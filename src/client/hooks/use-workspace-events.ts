"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSpecQueryKey, getGetStorageStatusQueryKey, getListSpecsQueryKey } from "@/client/api/generated";
import type { WorkspaceEvent } from "@/client/api/generated/model";
import { useEventSource } from "@/client/sse/use-event-source";
import { useWorkbenchConnectionStore } from "@/client/stores/workbench-connection-store";
import { useProposalStore } from "@/client/stores/workbench-proposal-store";
import { usePublishStore } from "@/client/stores/workbench-publish-store";

/**
 * `{file}` trong path API là đường dẫn tương đối có thể chứa `/` (vd `ui/header.md`); client Orval không tự encode
 * nên mọi lời gọi / query key spec theo file đi qua hàm này để key Query luôn khớp.
 */
export const specFileParam = (file: string) => encodeURIComponent(file);

export const workspaceEventsUrl = (workspaceId: string) => `/api/workspaces/${encodeURIComponent(workspaceId)}/events`;

/**
 * Nghe SSE `GET /api/workspaces/{id}/events` (CLAUDE.md › FE state):
 * - `SPEC_CHANGED` → chỉ `invalidateQueries` (danh sách, nội dung file, Storage Status); Query tự tải lại;
 * - `SPEC_PROPOSED` → hàng đợi đề xuất (DiffView);
 * - `PUBLISH_PROGRESS` → store tiến trình (Sync Activity + chip Header); xong thì invalidate danh sách / Storage Status.
 */
export function useWorkspaceEvents(workspaceId: string) {
  const queryClient = useQueryClient();

  const { status } = useEventSource<WorkspaceEvent>(workspaceEventsUrl(workspaceId), {
    onEvent: (event) => {
      if (event.workspaceId !== workspaceId) return;
      switch (event.type) {
        case "SPEC_CHANGED":
          void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
          void queryClient.invalidateQueries({ queryKey: getGetStorageStatusQueryKey(workspaceId) });
          if (event.change === "DELETED") queryClient.removeQueries({ queryKey: getGetSpecQueryKey(workspaceId, specFileParam(event.file)) });
          else void queryClient.invalidateQueries({ queryKey: getGetSpecQueryKey(workspaceId, specFileParam(event.file)) });
          break;
        case "SPEC_PROPOSED":
          useProposalStore.getState().enqueue({
            workspaceId: event.workspaceId,
            file: event.file,
            original: event.original,
            proposed: event.proposed,
            sourceId: event.sourceId,
          });
          break;
        case "PUBLISH_PROGRESS":
          usePublishStore.getState().applyProgress(event);
          if (event.finished) {
            void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
            void queryClient.invalidateQueries({ queryKey: getGetSpecQueryKey(workspaceId, specFileParam(event.file)) });
            void queryClient.invalidateQueries({ queryKey: getGetStorageStatusQueryKey(workspaceId) });
          }
          break;
      }
    },
  });

  useEffect(() => {
    useWorkbenchConnectionStore.getState().setWorkspaceEvents(status);
  }, [status]);

  return status;
}
