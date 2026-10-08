"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/**
 * Checkbox.md: ô 16px, viền 1.5px `input`; chọn = nền `primary` + dấu ✓ vẽ bằng nét riêng (chạy nét khi tick);
 * `indeterminate` = gạch ngang. Hover: viền `primary` + quầng `primary-soft` 3px; nhấn lún .9; focus viền 2px cách 2px.
 * `tone="quiet"`: trong SpecListItem, ô chưa chọn mờ đi, rõ lại khi rê/focus vào dòng cha có class `group/row`.
 */
const checkboxVariants = cva(
  "peer group/checkbox relative grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm border-[1.5px] border-input bg-card text-primary-foreground transition-[background-color,border-color,box-shadow,transform] duration-(--duration-base) ease-out focus-visible:outline-offset-2 not-disabled:hover:border-primary not-disabled:hover:shadow-[0_0_0_3px_var(--color-primary-soft)] not-disabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary motion-reduce:not-disabled:active:scale-100",
  {
    variants: {
      tone: {
        default: "",
        quiet:
          "data-[state=unchecked]:border-[color-mix(in_srgb,var(--color-input)_70%,transparent)] data-[state=unchecked]:bg-transparent group-hover/row:data-[state=unchecked]:border-input group-focus-within/row:data-[state=unchecked]:border-input",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

const markClass =
  "[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-(--duration-slow) ease-out";

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants> & {
    /** Không có `children` thì bắt buộc `label` (thành `aria-label`). */
    label?: string;
  };

function Checkbox({ className, tone, label, children, ...props }: CheckboxProps) {
  const box = (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      aria-label={children ? undefined : label}
      className={cn(checkboxVariants({ tone }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator forceMount className="pointer-events-none absolute -inset-[1.5px] grid place-items-center">
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path
            d="M4 8.5 6.8 11.2 12 5.2"
            pathLength={1}
            className={cn(markClass, "group-data-[state=checked]/checkbox:delay-[40ms] group-data-[state=checked]/checkbox:[stroke-dashoffset:0]")}
          />
          <path d="M4.5 8h7" pathLength={1} className={cn(markClass, "group-data-[state=indeterminate]/checkbox:[stroke-dashoffset:0]")} />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
  if (!children) return box;
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] leading-[18px] text-foreground has-disabled:cursor-not-allowed has-disabled:opacity-45">
      {box}
      <span>{children}</span>
    </label>
  );
}

export { Checkbox, checkboxVariants };
