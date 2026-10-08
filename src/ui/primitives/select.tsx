"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";
import { menuItemVariants, menuLabelClass, menuSeparatorClass, surfaceVariants } from "@/ui/primitives/surface";

/**
 * Select ngắn (< 8 item, không tìm kiếm) — Radix Select. Danh sách dài, chọn nhiều, tự nhập: dùng `Combobox`.
 * Trigger cùng dáng với Combobox: nền `card`, viền `input`, hover `accent`, icon `muted-foreground`.
 */
const selectTriggerVariants = cva(
  "flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-card pr-2 pl-3 text-left text-foreground transition-colors duration-(--duration-fast) ease-out not-disabled:hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive data-placeholder:text-muted-foreground data-[state=open]:outline-2 data-[state=open]:outline-offset-1 data-[state=open]:outline-ring [&>span]:min-w-0 [&>span]:truncate [&_svg]:shrink-0",
  {
    variants: {
      size: { sm: "h-(--size-control-sm) text-xs", md: "h-(--size-control) text-[13px]" },
      mono: { true: "font-mono text-xs", false: "" },
    },
    defaultVariants: { size: "md", mono: false },
  },
);

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size,
  mono,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & VariantProps<typeof selectTriggerVariants>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn(selectTriggerVariants({ size, mono }), className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        className={cn(
          surfaceVariants({ padding: "none" }),
          "relative max-h-[min(280px,var(--radix-select-content-available-height))] min-w-(--radix-select-trigger-width)",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
          <ChevronUp className="size-4" aria-hidden />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
          <ChevronDown className="size-4" aria-hidden />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn(menuLabelClass, className)} {...props} />;
}

/** Item đang chọn: dấu ✓ `primary` ở đầu dòng; `hint` chữ phụ bên phải. */
function SelectItem({
  className,
  children,
  hint,
  mono,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & { hint?: React.ReactNode; mono?: boolean }) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn(menuItemVariants(), "pr-3 pl-1", className)} {...props}>
      <span className="inline-grid w-4 shrink-0 place-items-center text-primary">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-primary!" aria-hidden />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText asChild>
        <span data-mono={mono || undefined} className="min-w-0 flex-1 truncate in-data-[state=checked]:font-medium data-mono:font-mono data-mono:text-xs">
          {children}
        </span>
      </SelectPrimitive.ItemText>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn(menuSeparatorClass, className)} {...props} />;
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue, selectTriggerVariants };
