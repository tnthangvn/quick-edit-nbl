"use client";

import * as React from "react";
import { Check, ChevronDown, CornerDownLeft, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/utils";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Checkbox } from "@/ui/primitives/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/ui/primitives/command";
import { Icon } from "@/ui/primitives/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/primitives/popover";
import { selectTriggerVariants } from "@/ui/primitives/select";

/**
 * Select.md — dropdown tự dựng (Popover + cmdk):
 * - ít item: chỉ danh sách; ≥ `searchThreshold` (mặc định 8): ô tìm theo label/value/hint + đếm `kết quả/tổng`;
 * - `allowCustom`: luôn có ô tìm, dòng cuối "Dùng “…”" khi chữ gõ không khớp item nào (Model ID);
 * - `multiple`: tag `primary` trên nút (tối đa `maxTags`, dư gộp `+n`), Checkbox mỗi dòng, chân: Bỏ chọn / Chọn tất cả (Chọn kết quả khi đang tìm);
 * - `group` → tiêu đề nhóm; `hint` chữ phụ bên phải; `mono` cho model ID / CLI profile; `side="top"` trong Quick Setting Toolbar.
 */
export type ComboboxOption = { value: string; label?: string; group?: string; hint?: string; disabled?: boolean };

type ComboboxBaseProps = {
  options: ReadonlyArray<string | ComboboxOption>;
  placeholder?: string;
  size?: "sm" | "md";
  mono?: boolean;
  searchable?: boolean;
  searchThreshold?: number;
  allowCustom?: boolean;
  side?: "top" | "bottom";
  align?: "start" | "end";
  disabled?: boolean;
  invalid?: boolean;
  /** Icon đứng trước giá trị trên nút (vd `terminal`, `sparkles`). */
  icon?: LucideIcon;
  className?: string;
  contentClassName?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

type ComboboxSingleProps = ComboboxBaseProps & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

type ComboboxMultipleProps = ComboboxBaseProps & {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  maxTags?: number;
};

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

const CUSTOM = "\u0000custom";

const normalize = (o: string | ComboboxOption): ComboboxOption => (typeof o === "string" ? { value: o } : o);
const labelOf = (o: ComboboxOption) => o.label ?? o.value;

function Combobox(props: ComboboxProps) {
  const {
    options: rawOptions,
    placeholder,
    size = "md",
    mono = false,
    searchable,
    searchThreshold = 8,
    allowCustom = false,
    side = "bottom",
    align = "start",
    disabled,
    invalid,
    icon,
    className,
    contentClassName,
    id,
  } = props;
  const t = useTranslations("common.combobox");
  const multiple = props.multiple === true;
  const maxTags = props.multiple ? (props.maxTags ?? 2) : 0;

  const options = React.useMemo(() => rawOptions.map(normalize), [rawOptions]);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  // Giá trị: controlled khi có `value`, ngược lại tự giữ từ `defaultValue`.
  const [inner, setInner] = React.useState<string | string[] | undefined>(props.defaultValue);
  const current = props.value ?? inner;
  const selected: string[] = multiple ? ((current as string[] | undefined) ?? []) : current ? [current as string] : [];

  const commit = (next: string | string[]) => {
    setInner(next);
    if (props.multiple) props.onChange?.(next as string[]);
    else props.onChange?.(next as string);
  };

  const searchOn = allowCustom || (searchable ?? options.length >= searchThreshold);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => [o.value, o.label, o.hint].some((s) => s?.toLowerCase().includes(q)))
    : options;
  const exact = options.some((o) => o.value.toLowerCase() === q || labelOf(o).toLowerCase() === q);
  const showCustom = allowCustom && q.length > 0 && !exact;

  const groups = React.useMemo(() => {
    const map = new Map<string, ComboboxOption[]>();
    for (const o of filtered) {
      const key = o.group ?? "";
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return [...map.entries()];
  }, [filtered]);

  const choose = (value: string) => {
    if (multiple) {
      commit(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
      return;
    }
    commit(value);
    setOpen(false);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const byValue = (v: string) => options.find((o) => o.value === v);
  const display = (v: string) => {
    const o = byValue(v);
    return o ? labelOf(o) : v;
  };

  const tags = selected.slice(0, maxTags);
  const rest = selected.slice(maxTags);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          id={id}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-disabled={disabled || undefined}
          aria-invalid={invalid || undefined}
          data-disabled={disabled || undefined}
          data-placeholder={selected.length === 0 || undefined}
          data-tags={(multiple && selected.length > 0) || undefined}
          className={cn(
            selectTriggerVariants({ size, mono }),
            "data-disabled:pointer-events-none data-disabled:opacity-45 data-tags:pl-1",
            className,
          )}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {icon ? <Icon icon={icon} size="sm" tone="muted" /> : null}
          {multiple && selected.length > 0 ? (
            <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {tags.map((v) => (
                <Badge key={v} variant="primary" size={size === "sm" ? "sm" : "md"} className="max-w-[140px] animate-scale-in gap-0.5 pr-0.5">
                  <span className="truncate">{display(v)}</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={t("remove", { label: display(v) })}
                    className="inline-grid size-4 cursor-pointer place-items-center rounded-[3px] transition-colors duration-(--duration-fast) hover:bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      commit(selected.filter((s) => s !== v));
                    }}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </Badge>
              ))}
              {rest.length > 0 ? (
                <Badge size={size === "sm" ? "sm" : "md"} title={rest.map(display).join(", ")}>
                  +{rest.length}
                </Badge>
              ) : null}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate in-data-placeholder:font-sans in-data-placeholder:text-[13px] in-data-placeholder:text-muted-foreground">
              {selected.length > 0 ? display(selected[0]) : (placeholder ?? t("placeholder"))}
            </span>
          )}
          <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        padding="none"
        side={side}
        align={align}
        className={cn("flex w-max max-w-[360px] min-w-(--radix-popover-trigger-width) flex-col", contentClassName)}
        onOpenAutoFocus={(e) => {
          if (!searchOn) {
            e.preventDefault();
            rootRef.current?.focus();
          }
        }}
      >
        <Command
          ref={rootRef}
          tabIndex={-1}
          shouldFilter={false}
          loop
          defaultValue={multiple ? undefined : selected[0]}
          data-side={side}
          className="data-[side=top]:flex-col-reverse"
        >
          {searchOn ? (
            <CommandInput
              value={query}
              onValueChange={setQuery}
              mono={mono}
              placeholder={allowCustom ? t("searchOrType") : t("search")}
              trailing={<span className="font-mono text-[11px] text-muted-foreground">{t("count", { shown: filtered.length, total: options.length })}</span>}
              onKeyDown={(e) => {
                if (multiple && e.key === "Backspace" && query === "" && selected.length > 0) {
                  commit(selected.slice(0, -1));
                }
              }}
            />
          ) : null}
          <CommandList id={listId} aria-multiselectable={multiple || undefined}>
            {!showCustom ? <CommandEmpty>{t("empty")}</CommandEmpty> : null}
            {groups.map(([group, items]) => (
              <CommandGroup key={group || "_"} heading={group || undefined}>
                {items.map((o) => {
                  const isOn = selected.includes(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={o.value}
                      disabled={o.disabled}
                      onSelect={() => choose(o.value)}
                      data-checked={isOn || undefined}
                      className="pr-3 pl-1"
                    >
                      {multiple ? (
                        <Checkbox checked={isOn} tabIndex={-1} aria-hidden className="pointer-events-none mx-0.5 ml-1 hover:shadow-none" />
                      ) : (
                        <span className="inline-grid w-4 shrink-0 place-items-center">
                          {isOn ? <Check className="size-4 text-primary!" aria-hidden /> : null}
                        </span>
                      )}
                      <span data-mono={mono || undefined} className="min-w-0 flex-1 truncate in-data-checked:font-medium data-mono:font-mono data-mono:text-xs">
                        {labelOf(o)}
                      </span>
                      {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {showCustom ? (
              <CommandItem value={CUSTOM} onSelect={() => choose(query.trim())} className="pr-3 pl-1">
                <span className="inline-grid w-4 shrink-0 place-items-center">
                  <CornerDownLeft className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate">{t("useCustom", { value: query.trim() })}</span>
              </CommandItem>
            ) : null}
          </CommandList>
          {multiple ? (
            <div className="flex h-9 shrink-0 items-center gap-1 border-t border-border pr-2 pl-3 in-data-[side=top]:border-t-0 in-data-[side=top]:border-b">
              <span className="flex-1 text-xs text-muted-foreground">{t("selectedCount", { count: selected.length })}</span>
              <Button variant="text" size="sm" className="h-[26px] rounded-sm text-xs" disabled={selected.length === 0} onClick={() => commit([])}>
                {t("clear")}
              </Button>
              <Button
                variant="text"
                size="sm"
                className="h-[26px] rounded-sm text-xs"
                disabled={filtered.length === 0}
                onClick={() => commit([...new Set([...selected, ...filtered.filter((o) => !o.disabled).map((o) => o.value)])])}
              >
                {q ? t("selectResults") : t("selectAll")}
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
