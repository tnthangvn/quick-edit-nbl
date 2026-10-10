"use client";

import * as React from "react";
import { Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CliEffort } from "@/client/api/generated/model";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/primitives/popover";
import { Slider } from "@/ui/primitives/slider";

/**
 * Chọn effort của CLI agent (giống thanh Effort của Claude): nút nhỏ hiện mức hiện tại, popover có thanh trượt
 * Faster ↔ Smarter qua các mức `levels`, kèm "Mặc định" (không truyền cờ, CLI tự chọn).
 */
type EffortPickerProps = {
  value: CliEffort;
  /** Các mức CLI hỗ trợ, thấp → cao (không gồm DEFAULT). */
  levels: readonly Exclude<CliEffort, "DEFAULT">[];
  onChange: (value: CliEffort) => void;
  disabled?: boolean;
};

function EffortPicker({ value, levels, onChange, disabled }: EffortPickerProps) {
  const t = useTranslations("common.effort");
  const index = value === "DEFAULT" ? -1 : levels.indexOf(value);
  // Đang kéo: hiện mức tạm, chỉ lưu khi thả tay (tránh gọi API liên tục).
  const [draft, setDraft] = React.useState<number | null>(null);
  const shown = draft ?? index;
  const label = shown < 0 ? t("DEFAULT") : t(levels[shown]);

  return (
    <Popover onOpenChange={() => setDraft(null)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled} aria-label={t("label", { level: label })} className="gap-1 px-1.5 text-xs text-muted-foreground">
          <Icon icon={Gauge} size="sm" />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs leading-4 text-muted-foreground">{t("title")}</span>
          <span className="text-[13px] leading-[18px] font-medium">{label}</span>
          <span className="flex-1" />
          {value !== "DEFAULT" ? (
            <Button variant="text" size="sm" className="h-5 px-1 text-xs" onClick={() => onChange("DEFAULT")}>
              {t("reset")}
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex justify-between text-[11px] leading-4 text-muted-foreground">
          <span>{t("faster")}</span>
          <span>{t("smarter")}</span>
        </div>
        <Slider
          className="mt-1"
          min={0}
          max={levels.length - 1}
          step={1}
          stops={levels.length}
          value={[Math.max(shown, 0)]}
          thumbLabel={t("title")}
          onValueChange={([v]) => setDraft(v)}
          onValueCommit={([v]) => {
            setDraft(null);
            if (levels[v] !== value) onChange(levels[v]);
          }}
        />
        <p className="m-0 mt-2 text-[11px] leading-4 text-muted-foreground">{shown < 0 ? t("defaultHint") : t(`hint.${levels[shown]}`)}</p>
      </PopoverContent>
    </Popover>
  );
}

export { EffortPicker, type EffortPickerProps };
