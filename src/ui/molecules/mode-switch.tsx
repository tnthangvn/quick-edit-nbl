"use client";

import * as React from "react";
import { KeyRound, Terminal } from "lucide-react";
import { useTranslations } from "next-intl";
import { AgentMode } from "@/client/api/generated/model";
import { Icon } from "@/ui/primitives/icon";
import { Segmented, SegmentedItem } from "@/ui/primitives/segmented";

/** ModeSwitch.md: segmented `API Key` ↔ `CLI Agent` (giá trị `AgentMode`). Đang bật: nền `card`, icon `primary`. */
type ModeSwitchProps = {
  value: AgentMode;
  onValueChange: (mode: AgentMode) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
};

const MODE_ICON = { API: KeyRound, CLI: Terminal } as const;

function ModeSwitch({ value, onValueChange, size, disabled, className }: ModeSwitchProps) {
  const t = useTranslations("common.mode");
  return (
    <Segmented
      value={value}
      onValueChange={(v) => onValueChange(v as AgentMode)}
      size={size}
      disabled={disabled}
      aria-label={t("label")}
      className={className}
    >
      {Object.values(AgentMode).map((mode) => (
        <SegmentedItem key={mode} value={mode}>
          <Icon icon={MODE_ICON[mode]} />
          {t(mode)}
        </SegmentedItem>
      ))}
    </Segmented>
  );
}

export { ModeSwitch, type ModeSwitchProps };
