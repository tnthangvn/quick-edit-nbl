"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getGetSpecQueryKey, getListSpecsQueryKey, useApproveSpec } from "@/client/api/generated";
import type { ApproveSpecResult } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { specFileParam } from "@/client/hooks/use-workspace-events";
import { draftKey, useWorkbenchEditorStore } from "@/client/stores/workbench-editor-store";
import { usePublishStore } from "@/client/stores/workbench-publish-store";
import { notify } from "@/ui/primitives/sonner";

/**
 * Approve & Save (spec 6.4): PUT nội dung → file được ghi, pipeline publish chạy nền (`runId`) → mở bảng Sync Activity.
 * Dùng chung cho Editor (Ctrl/Cmd+S) và DiffView (duyệt đề xuất).
 *
 * Ghi kết quả `spec` vào cache `getSpec` (thay vì chờ tải lại) để Monaco không nhảy về nội dung cũ giữa lúc bỏ nháp
 * và lúc refetch; danh sách thì invalidate như thường.
 */
export function useSaveSpec(workspaceId: string) {
  const t = useTranslations("workbench.toast");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useApproveSpec();
  const { mutateAsync } = mutation;

  const save = useCallback(
    async (file: string, content: string): Promise<ApproveSpecResult | null> => {
      try {
        const result = await mutateAsync({ workspaceId, file: specFileParam(file), data: { content } });
        queryClient.setQueryData(getGetSpecQueryKey(workspaceId, specFileParam(result.spec.file)), result.spec);
        void queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey(workspaceId) });
        // Bỏ nháp nếu người dùng chưa gõ thêm trong lúc lưu.
        const editor = useWorkbenchEditorStore.getState();
        const draft = editor.drafts[draftKey(workspaceId, file)];
        if (draft !== undefined) editor.setDraft(workspaceId, file, draft, content);
        usePublishStore.getState().openPanel(result.spec.file, result.runId);
        return result;
      } catch (err) {
        notify.error(t("saveFailed", { file }), { description: errorMessage(err) });
        return null;
      }
    },
    [errorMessage, mutateAsync, queryClient, t, workspaceId],
  );

  return { save, saving: mutation.isPending };
}
