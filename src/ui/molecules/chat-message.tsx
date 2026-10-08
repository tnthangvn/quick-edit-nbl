"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Bot, Terminal, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SpecSyncStatus } from "@/client/api/generated/model";
import { cn } from "@/ui/utils";
import { StatusBadge } from "@/ui/primitives/badge";
import { Icon } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";

/**
 * ChatMessage.md — một mục trong luồng chat:
 * - `user`: bong bóng `muted`, căn phải;
 * - `assistant`: avatar `bot` trên `primary-soft`, chữ thường;
 * - `tool`: một dòng `font-mono` tên tool + StatusBadge (vd `propose_spec_update` → "Chờ duyệt");
 * - `log`: stdout của CLI Agent, mono 12/18 trên `editor`, `streaming` hiện spinner và tự cuộn xuống cuối.
 */
const chatMessageVariants = cva("text-sm leading-5", {
  variants: {
    variant: {
      user: "max-w-[80%] self-end rounded-lg bg-muted px-3 py-2 whitespace-pre-wrap",
      assistant: "flex items-start gap-2",
      tool: "flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground",
      log: "overflow-hidden rounded-md border border-border bg-editor",
    },
  },
  defaultVariants: { variant: "assistant" },
});

type ChatMessageProps = VariantProps<typeof chatMessageVariants> & {
  children?: React.ReactNode;
  /** tool: tên tool (mono). */
  toolName?: string;
  /** tool: trạng thái + nhãn tuỳ biến. */
  status?: SpecSyncStatus;
  statusLabel?: string;
  /** log: tiêu đề khối (vd `claude -p …`). */
  logTitle?: string;
  streaming?: boolean;
  className?: string;
};

function ChatMessage({ variant, children, toolName, status, statusLabel, logTitle, streaming = false, className }: ChatMessageProps) {
  const t = useTranslations("common.chat");
  const logRef = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    const el = logRef.current;
    if (el && streaming) el.scrollTop = el.scrollHeight;
  }, [children, streaming]);

  const classes = cn(chatMessageVariants({ variant }), className);

  switch (variant) {
    case "user":
      return (
        <div data-slot="chat-message" data-variant="user" className={classes}>
          {children}
        </div>
      );
    case "tool":
      return (
        <div data-slot="chat-message" data-variant="tool" className={classes}>
          <Icon icon={Wrench} size="sm" />
          <code className="font-mono text-xs text-foreground">{toolName}</code>
          {children ? <span className="min-w-0 flex-1 truncate">{children}</span> : <span className="flex-1" />}
          {status ? <StatusBadge status={status} label={statusLabel} /> : null}
        </div>
      );
    case "log":
      return (
        <div data-slot="chat-message" data-variant="log" className={classes} aria-busy={streaming || undefined}>
          <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-1 font-mono text-xs leading-[18px] text-muted-foreground">
            <Icon icon={Terminal} size="sm" />
            <span className="min-w-0 flex-1 truncate">{logTitle ?? t("log")}</span>
            {streaming ? <Spinner size="xs" tone="primary" label={t("running")} /> : null}
          </div>
          <pre ref={logRef} className="m-0 max-h-[180px] overflow-auto px-3 py-2 font-mono text-xs leading-[18px] whitespace-pre-wrap text-foreground">
            {children}
          </pre>
        </div>
      );
    default:
      return (
        <div data-slot="chat-message" data-variant="assistant" className={classes}>
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-soft text-primary" aria-label={t("agent")} role="img">
            <Icon icon={Bot} size="sm" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">{children}</div>
        </div>
      );
  }
}

export { ChatMessage, chatMessageVariants, type ChatMessageProps };
