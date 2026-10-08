"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, CircleDashed, CircleSlash, Ellipsis, KeyRound, Lock, Pencil, Plug, Terminal, Trash, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ConnectorType, GitProvider } from "@/client/api/generated/model";
import { cn } from "@/ui/utils";
import { Badge } from "@/ui/primitives/badge";
import { Button, IconButton } from "@/ui/primitives/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/primitives/dropdown-menu";
import { Icon } from "@/ui/primitives/icon";

/**
 * Một connector Git provider (spec 3.0.2, Settings › Integrations): loại, provider, tài khoản, trạng thái, nút Kiểm tra, menu Sửa / Xoá.
 * `state` là trạng thái hiển thị; API chưa có enum trạng thái connector — đổi sang enum sinh ra khi BE bổ sung.
 */
export type ConnectorRowState = "CONNECTED" | "NEEDS_LOGIN" | "NOT_FOUND" | "ERROR" | "UNCHECKED";

const TYPE_ICON: Record<ConnectorType, LucideIcon> = { CLI: Terminal, MCP: Plug, TOKEN: KeyRound, SSH: Lock };
const STATE_ICON: Record<ConnectorRowState, LucideIcon> = {
  CONNECTED: CircleCheck,
  NEEDS_LOGIN: TriangleAlert,
  NOT_FOUND: CircleSlash,
  ERROR: CircleAlert,
  UNCHECKED: CircleDashed,
};

const connectorStateVariants = cva("inline-flex items-center gap-1 text-xs leading-4 whitespace-nowrap", {
  variants: {
    state: {
      CONNECTED: "text-primary",
      NEEDS_LOGIN: "text-warning",
      NOT_FOUND: "text-muted-foreground",
      ERROR: "text-destructive",
      UNCHECKED: "text-muted-foreground",
    } satisfies Record<ConnectorRowState, string>,
  },
});

type ConnectorRowProps = {
  name: string;
  type: ConnectorType;
  provider?: GitProvider;
  /** Tài khoản đang đăng nhập / host / phiên bản CLI — mono. */
  account?: string | null;
  state: ConnectorRowState;
  onTest?: () => void;
  testing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
};

function ConnectorRow({ name, type, provider, account, state, onTest, testing, onEdit, onDelete, className }: ConnectorRowProps) {
  const t = useTranslations("common");
  return (
    <div data-slot="connector-row" className={cn("flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon icon={TYPE_ICON[type]} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] leading-[18px] font-medium">{name}</span>
          <Badge size="xs">{t(`connector.type.${type}`)}</Badge>
          {provider ? <span className="truncate text-xs text-muted-foreground">{t(`connector.provider.${provider}`)}</span> : null}
        </div>
        {account ? <div className="truncate font-mono text-[11px] leading-4 text-muted-foreground">{account}</div> : null}
      </div>
      <span className={connectorStateVariants({ state })}>
        <Icon icon={STATE_ICON[state]} size="xs" />
        {t(`connector.state.${state}`)}
      </span>
      {onTest ? (
        <Button variant="outline" size="sm" loading={testing} onClick={onTest}>
          {t("actions.test")}
        </Button>
      ) : null}
      {onEdit || onDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton icon={Ellipsis} size="icon-sm" label={t("connector.menu", { name })} tooltip={false} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit ? (
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                {t("actions.edit")}
              </DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <>
                {onEdit ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem tone="destructive" onSelect={onDelete}>
                  <Trash />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export { ConnectorRow, connectorStateVariants, type ConnectorRowProps };
