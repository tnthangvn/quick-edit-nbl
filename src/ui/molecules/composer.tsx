"use client";

import * as React from "react";
import { SendHorizontal, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/utils";
import { Button } from "@/ui/primitives/button";
import { Kbd, KbdGroup } from "@/ui/primitives/kbd";
import { Textarea } from "@/ui/primitives/textarea";

/**
 * Composer.md — Chatbox: textarea tự co giãn (tối đa 200px), gợi ý phím tắt, nút Send.
 * `⌘/Ctrl + Enter` gửi. Khi `busy` (đang stream) nút Send thành `Dừng` → `onStop`. Focus vẽ viền `ring` quanh cả khung.
 */
type ComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Chèn bên trái thanh dưới, trước gợi ý phím tắt (vd số spec trong context). */
  leading?: React.ReactNode;
  className?: string;
};

const subscribeNoop = () => () => {};
const isMacClient = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function Composer({ value, onValueChange, onSubmit, onStop, busy = false, disabled = false, placeholder, leading, className }: ComposerProps) {
  const t = useTranslations("common");
  const isMac = React.useSyncExternalStore(subscribeNoop, isMacClient, () => false);
  const canSend = !disabled && !busy && value.trim().length > 0;

  return (
    <div
      data-slot="composer"
      className={cn(
        "rounded-lg border border-input bg-card has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:-outline-offset-1 has-[textarea:focus-visible]:outline-ring",
        className,
      )}
    >
      <Textarea
        appearance="bare"
        autosize
        rows={1}
        value={value}
        disabled={disabled}
        aria-label={t("composer.label")}
        placeholder={placeholder ?? t("composer.placeholder")}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        className="min-h-11 px-3 pt-3 pb-1"
      />
      <div className="flex items-center gap-2 pt-1 pr-2 pb-2 pl-3">
        {leading}
        <span className="inline-flex items-center gap-[3px] text-xs text-muted-foreground">
          <KbdGroup>
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>Enter</Kbd>
          </KbdGroup>
          <span className="ml-1">{t("composer.hint")}</span>
        </span>
        <span className="flex-1" />
        {busy ? (
          <Button variant="secondary" size="sm" icon={Square} onClick={onStop}>
            {t("actions.stop")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" icon={SendHorizontal} disabled={!canSend} onClick={onSubmit}>
            {t("actions.send")}
          </Button>
        )}
      </div>
    </div>
  );
}

export { Composer, type ComposerProps };
