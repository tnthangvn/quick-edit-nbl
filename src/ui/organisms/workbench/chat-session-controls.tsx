"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { History, SquarePen, Trash2 } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { deleteAgentSession, getListAgentSessionsQueryKey, useListAgentSessions } from "@/client/api/generated";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { forgetSessionChat } from "@/client/stores/workbench-chat";
import { useActiveSessionId, useAgentSessionStore } from "@/client/stores/workbench-session-store";
import { IconButton } from "@/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";
import { notify } from "@/ui/primitives/sonner";

type ChatSessionControlsProps = { workspaceId: string; disabled: boolean };

/**
 * Phiên chat Agent trên Quick Setting Toolbar: New session (bỏ chọn phiên hiện tại; phiên mới tạo khi gửi prompt đầu)
 * và History (mở lại phiên cũ, xoá phiên đang mở). Khoá khi Agent đang chạy.
 */
export function ChatSessionControls({ workspaceId, disabled }: ChatSessionControlsProps) {
  const t = useTranslations("workbench.toolbar");
  const tChat = useTranslations("workbench.chat");
  const errorMessage = useErrorMessage();
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const queryClient = useQueryClient();
  const activeId = useActiveSessionId(workspaceId);
  const [open, setOpen] = React.useState(false);
  const sessions = useListAgentSessions({ workspaceId }, { query: { enabled: open } });
  const listKey = getListAgentSessionsQueryKey({ workspaceId });

  const { setActive, clearActive } = useAgentSessionStore.getState();

  const removeActive = async () => {
    if (!activeId) return;
    try {
      await deleteAgentSession(activeId);
      forgetSessionChat(activeId);
      clearActive(workspaceId);
      void queryClient.invalidateQueries({ queryKey: listKey });
    } catch (err) {
      notify.error(t("deleteSessionFailed"), { description: errorMessage(err) });
    }
  };

  const items = sessions.data?.items ?? [];

  // Mỗi lần mở đọc lại danh sách: tiêu đề / thời gian đổi sau mỗi lượt chat.
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void queryClient.invalidateQueries({ queryKey: listKey });
  };

  return (
    <>
      <IconButton
        icon={SquarePen}
        size="icon-sm"
        label={t("newSession")}
        tooltipSide="top"
        disabled={disabled || !activeId}
        onClick={() => clearActive(workspaceId)}
      />
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <IconButton icon={History} size="icon-sm" label={t("history")} tooltip={false} />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[300px]">
          <DropdownMenuLabel>{t("history")}</DropdownMenuLabel>
          {sessions.isPending ? <DropdownMenuItem disabled>{t("historyLoading")}</DropdownMenuItem> : null}
          {sessions.isError ? <DropdownMenuItem disabled>{errorMessage(sessions.error)}</DropdownMenuItem> : null}
          {sessions.isSuccess && items.length === 0 ? <DropdownMenuItem disabled>{t("historyEmpty")}</DropdownMenuItem> : null}
          {items.length > 0 ? (
            <DropdownMenuRadioGroup value={activeId ?? ""} onValueChange={(id) => setActive(workspaceId, id)}>
              {items.map((s) => (
                <DropdownMenuRadioItem key={s.id} value={s.id}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{s.title ?? tChat("untitled")}</span>
                    <span className="text-xs leading-4 text-muted-foreground">{format.relativeTime(new Date(s.updatedAt), now)}</span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          ) : null}
          {activeId ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="destructive" onSelect={() => void removeActive()}>
                <Trash2 />
                {t("deleteSession")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
