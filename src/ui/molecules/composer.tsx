"use client";

import * as React from "react";
import { FileText, SendHorizontal, Square, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/utils";
import { Button, IconButton } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Kbd, KbdGroup } from "@/ui/primitives/kbd";
import { RowButton } from "@/ui/primitives/row-button";
import { Textarea } from "@/ui/primitives/textarea";

/**
 * Composer.md — Chatbox: textarea tự co giãn (tối đa 200px), gợi ý phím tắt, nút Send.
 * `⌘/Ctrl + Enter` gửi. Khi `busy` (đang stream) nút Send thành `Dừng` → `onStop`. Focus vẽ viền `ring` quanh cả khung.
 * - Dán ảnh (Ctrl/⌘+V): `onPasteImages` nhận file ảnh; ảnh đã đính kèm hiện thumbnail (`attachments`), bỏ bằng nút ×.
 * - Gõ `@`: gợi ý file trong `mentions` (lọc theo chữ sau @), ↑↓ chọn, Enter / Tab chèn `@đường/dẫn`, Esc đóng.
 */
export type ComposerAttachment = { id: string; name: string; url: string };

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
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
  onPasteImages?: (files: File[]) => void;
  /** Danh sách file để gợi ý khi gõ `@`. */
  mentions?: readonly string[];
  /** Đã chọn một file từ gợi ý `@` (vd thêm vào context). */
  onMention?: (file: string) => void;
  className?: string;
};

const subscribeNoop = () => () => {};
const isMacClient = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MAX_SUGGESTIONS = 8;

type MentionState = { start: number; query: string; active: number };

/** `@query` ngay trước con trỏ (đầu dòng hoặc sau khoảng trắng). */
function mentionAt(text: string, caret: number): Omit<MentionState, "active"> | null {
  const m = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
  return m ? { start: caret - m[2].length - 1, query: m[2] } : null;
}

function filterMentions(items: readonly string[], query: string): string[] {
  const q = query.toLowerCase();
  const scored = items
    .map((f) => {
      const lower = f.toLowerCase();
      const base = lower.split("/").at(-1) ?? lower;
      const score = !q ? 0 : base.startsWith(q) ? 0 : lower.startsWith(q) ? 1 : lower.includes(q) ? 2 : -1;
      return { f, score };
    })
    .filter((x) => x.score >= 0);
  return scored.sort((a, b) => a.score - b.score || a.f.localeCompare(b.f)).slice(0, MAX_SUGGESTIONS).map((x) => x.f);
}

function Composer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  busy = false,
  disabled = false,
  placeholder,
  leading,
  attachments = [],
  onRemoveAttachment,
  onPasteImages,
  mentions,
  onMention,
  className,
}: ComposerProps) {
  const t = useTranslations("common");
  const isMac = React.useSyncExternalStore(subscribeNoop, isMacClient, () => false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [mention, setMention] = React.useState<MentionState | null>(null);
  const canSend = !disabled && !busy && value.trim().length > 0;
  const listId = React.useId();

  const suggestions = React.useMemo(() => (mention && mentions ? filterMentions(mentions, mention.query) : []), [mention, mentions]);
  const open = mention !== null && suggestions.length > 0;

  const syncMention = (text: string, caret: number) => {
    if (!mentions?.length) return;
    const at = mentionAt(text, caret);
    setMention((prev) => (at ? { ...at, active: prev && prev.start === at.start ? Math.min(prev.active, MAX_SUGGESTIONS - 1) : 0 } : null));
  };

  const pick = (file: string) => {
    if (!mention) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? value.length;
    const insert = `@${file} `;
    const next = value.slice(0, mention.start) + insert + value.slice(caret);
    onValueChange(next);
    onMention?.(file);
    setMention(null);
    const pos = mention.start + insert.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && mention) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        setMention({ ...mention, active: (mention.active + delta + suggestions.length) % suggestions.length });
        return;
      }
      if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
        e.preventDefault();
        pick(suggestions[mention.active] ?? suggestions[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPasteImages) return;
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    e.preventDefault();
    onPasteImages(files);
  };

  return (
    <div
      data-slot="composer"
      className={cn(
        "relative rounded-lg border border-input bg-card has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:-outline-offset-1 has-[textarea:focus-visible]:outline-ring",
        className,
      )}
    >
      {open && mention ? (
        <div
          id={listId}
          role="listbox"
          aria-label={t("composer.mentionLabel")}
          className="absolute right-2 bottom-full left-2 z-20 mb-1 animate-pop-up overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-popover"
        >
          <p className="m-0 px-1.5 pt-0.5 pb-1 text-[11px] leading-4 font-semibold tracking-[.06em] text-muted-foreground uppercase">{t("composer.mentionTitle")}</p>
          {suggestions.map((file, i) => (
            <RowButton
              key={file}
              role="option"
              aria-selected={i === mention.active}
              size="md"
              className="aria-selected:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setMention({ ...mention, active: i })}
              onClick={() => pick(file)}
            >
              <Icon icon={FileText} size="sm" tone="muted" />
              <code className="min-w-0 truncate font-mono text-xs">{file}</code>
            </RowButton>
          ))}
        </div>
      ) : null}
      {attachments.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 px-3 pt-3 pb-0" aria-label={t("composer.attachments")}>
          {attachments.map((a) => (
            <li key={a.id} className="group/att relative size-14 overflow-hidden rounded-md border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL cục bộ, next/image không tối ưu được */}
              <img src={a.url} alt={a.name} className="size-full object-cover" />
              {onRemoveAttachment ? (
                <IconButton
                  icon={X}
                  size="icon-sm"
                  variant="secondary"
                  tooltip={false}
                  label={t("composer.removeAttachment", { name: a.name })}
                  onClick={() => onRemoveAttachment(a.id)}
                  className="absolute top-0.5 right-0.5 size-5 opacity-0 group-hover/att:opacity-100 focus-visible:opacity-100"
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Textarea
        ref={textareaRef}
        appearance="bare"
        autosize
        rows={1}
        value={value}
        disabled={disabled}
        aria-label={t("composer.label")}
        aria-autocomplete={mentions ? "list" : undefined}
        aria-controls={open ? listId : undefined}
        aria-expanded={mentions ? open : undefined}
        placeholder={placeholder ?? t("composer.placeholder")}
        onChange={(e) => {
          onValueChange(e.target.value);
          syncMention(e.target.value, e.target.selectionStart);
        }}
        onSelect={(e) => mention && syncMention(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={() => setMention(null)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
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
