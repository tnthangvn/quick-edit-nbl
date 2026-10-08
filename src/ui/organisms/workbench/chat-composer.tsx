"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createAgentSession, getListAgentSessionsQueryKey } from "@/client/api/generated";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useCliRunActions } from "@/client/hooks/use-cli-run";
import { getSessionChat } from "@/client/stores/workbench-chat";
import { useContextFiles } from "@/client/stores/workbench-editor-store";
import { useActiveSessionId, useAgentSessionStore } from "@/client/stores/workbench-session-store";
import { Composer } from "@/ui/molecules/composer";
import { Badge } from "@/ui/primitives/badge";
import { notify } from "@/ui/primitives/sonner";
import { useAgentBusy } from "./use-agent-busy";
import { useAgentSettings } from "./use-agent-settings";

const MAX_CHIPS = 3;

/**
 * Chatbox (Composer.md, spec 3.4): gửi prompt theo chế độ đang bật — API: `useChat.sendMessage` (context = spec đã tick);
 * CLI: `startCliRun` rồi theo dõi qua SSE. Đang chạy thì nút Send thành Dừng. Chip context hiển thị spec đã chọn.
 * Chưa có phiên chat (mới mở / vừa bấm New session) → tạo phiên rồi mới gửi.
 */
export function ChatComposer({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations("workbench.composer");
  const errorMessage = useErrorMessage();
  const [value, setValue] = React.useState("");
  const queryClient = useQueryClient();
  const { mode, profileId, loading } = useAgentSettings();
  const sessionId = useActiveSessionId(workspaceId);
  const chat = useChat({ chat: getSessionChat(workspaceId, sessionId) });
  const { apiBusy, cliRunning } = useAgentBusy(workspaceId);
  const cli = useCliRunActions(workspaceId);
  const context = useContextFiles(workspaceId);
  const [starting, setStarting] = React.useState(false);

  const busy = (mode === "API" ? apiBusy : cliRunning) || starting;

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    const created = await createAgentSession({ workspaceId });
    useAgentSessionStore.getState().setActive(workspaceId, created.id);
    void queryClient.invalidateQueries({ queryKey: getListAgentSessionsQueryKey({ workspaceId }) });
    return created.id;
  };

  const submit = async () => {
    const prompt = value.trim();
    if (!prompt) return;
    setStarting(true);
    try {
      const id = await ensureSession();
      if (mode === "API") {
        const target = getSessionChat(workspaceId, id);
        if (target.error) target.clearError();
        setValue("");
        void target.sendMessage({ text: prompt });
        return;
      }
      await cli.start({ sessionId: id, profileId, prompt, contextFiles: [...context] });
      setValue("");
    } catch (err) {
      notify.error(mode === "API" ? t("sessionFailed") : t("cliStartFailed"), { description: errorMessage(err) });
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    if (mode === "API") void chat.stop();
    else cli.stop().catch((err: unknown) => notify.error(t("cliStopFailed"), { description: errorMessage(err) }));
  };

  const leading =
    context.length === 0 ? (
      <span className="text-xs leading-4 text-muted-foreground">{t("noContext")}</span>
    ) : (
      <span className="flex min-w-0 items-center gap-1" aria-label={t("contextLabel", { count: context.length })}>
        {context.slice(0, MAX_CHIPS).map((file) => (
          <Badge key={file} variant="primary" size="xs" className="max-w-[160px]">
            <code className="truncate">{file}</code>
          </Badge>
        ))}
        {context.length > MAX_CHIPS ? (
          <Badge variant="neutral" size="xs">
            +{context.length - MAX_CHIPS}
          </Badge>
        ) : null}
      </span>
    );

  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSubmit={() => void submit()}
      onStop={stop}
      busy={busy}
      disabled={loading}
      placeholder={mode === "API" ? t("placeholderApi") : t("placeholderCli")}
      leading={leading}
    />
  );
}
