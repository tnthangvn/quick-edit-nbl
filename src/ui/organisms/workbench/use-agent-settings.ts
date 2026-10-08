"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getGetSettingsQueryKey, useGetSettings, useUpdateSettings } from "@/client/api/generated";
import type { AgentMode, AgentSettingsView, CliPermissionMode, UpdateSettingsInput } from "@/client/api/generated/model";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { notify } from "@/ui/primitives/sonner";

type QuickPatch = { activeMode?: AgentMode; model?: string; activeProfileId?: string; permissionMode?: CliPermissionMode };

/** View (GET) → input (PUT): giữ nguyên mọi trường, chỉ đổi phần chọn nhanh. Bỏ `apiKey` = giữ key đã lưu. */
export function toSettingsInput(view: AgentSettingsView, patch: QuickPatch): UpdateSettingsInput {
  return {
    activeMode: patch.activeMode ?? view.activeMode,
    api: {
      provider: view.api.provider,
      model: patch.model ?? view.api.model,
      baseUrl: view.api.baseUrl,
      temperature: view.api.temperature,
      systemPrompt: view.api.systemPrompt,
    },
    cli: {
      activeProfileId: patch.activeProfileId ?? view.cli.activeProfileId,
      streamStdout: view.cli.streamStdout,
      permissionMode: patch.permissionMode ?? view.cli.permissionMode,
      profiles: view.cli.profiles,
    },
  };
}

/**
 * Cấu hình Agent dùng chung cho Quick Setting Toolbar / Composer / log chat (spec 3.4): chế độ API / CLI, model, CLI profile,
 * mức quyền của CLI.
 * Trong lúc lưu hiển thị ngay giá trị mới (biến của mutation), không sửa cache tay.
 */
export function useAgentSettings() {
  const t = useTranslations("workbench.toast");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const settings = useGetSettings();
  const update = useUpdateSettings({
    mutation: {
      onSettled: () => queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() }),
      onError: (err) => notify.error(t("settingsFailed"), { description: errorMessage(err) }),
    },
  });

  const view = settings.data;
  const pending = update.isPending ? update.variables?.data : undefined;
  const mode: AgentMode = pending?.activeMode ?? view?.activeMode ?? "API";
  const model = pending?.api.model ?? view?.api.model ?? "";
  const profileId = pending?.cli.activeProfileId ?? view?.cli.activeProfileId ?? "";
  const permissionMode: CliPermissionMode = pending?.cli.permissionMode ?? view?.cli.permissionMode ?? "BYPASS";
  const { mutate } = update;

  const patch = useCallback(
    (p: QuickPatch) => {
      if (view) mutate({ data: toSettingsInput(view, p) });
    },
    [view, mutate],
  );

  return { view, loading: settings.isPending, mode, model, profileId, permissionMode, profiles: view?.cli.profiles ?? [], patch, saving: update.isPending };
}
