"use client";

import { PanelBottom, PanelLeft, PanelRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CHAT_DOCKS, type ChatDock, useUiStore } from "@/client/stores/ui-store";
import { IconButton } from "@/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";

const DOCK_ICON = { BOTTOM: PanelBottom, LEFT: PanelLeft, RIGHT: PanelRight } as const;

/** Đổi vị trí khung chat Agent: dưới Editor, cột trái cạnh sidebar hoặc cột phải (cao hết màn). Lưu theo trình duyệt. */
export function ChatDockMenu() {
  const t = useTranslations("workbench.toolbar");
  const dock = useUiStore((s) => s.chatDock);
  const setDock = useUiStore((s) => s.setChatDock);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton icon={DOCK_ICON[dock]} size="icon-sm" label={t("dock")} tooltip={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end">
        <DropdownMenuLabel>{t("dock")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={dock} onValueChange={(v) => setDock(v as ChatDock)}>
          {CHAT_DOCKS.map((d) => {
            const DockIcon = DOCK_ICON[d];
            return (
              <DropdownMenuRadioItem key={d} value={d}>
                <DockIcon />
                {t(`dockOption.${d}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
