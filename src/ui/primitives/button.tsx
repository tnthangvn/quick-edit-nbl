"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, type LucideIcon } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/ui/utils";
import { Icon, iconMotionFor, type IconMotion } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/primitives/tooltip";

/**
 * Button.md / IconButton.md.
 * - Hover đổi nền/viền/chữ 150ms ease-out; nhấn lún .97 (`press`), IconButton lún .92.
 * - `primary` và `destructive` hover tối hơn ở light, sáng hơn ở dark (trộn với `foreground`).
 * - Mỗi vùng chỉ một nút `primary`.
 */
const buttonVariants = cva(
  "group relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent text-[13px] leading-[18px] font-medium whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground not-disabled:hover:bg-[color-mix(in_srgb,var(--color-primary)_88%,var(--color-foreground))]",
        secondary: "bg-secondary text-secondary-foreground not-disabled:hover:border-border not-disabled:hover:bg-accent",
        outline: "border-input bg-card text-foreground not-disabled:hover:bg-accent",
        ghost: "bg-transparent text-foreground not-disabled:hover:bg-accent",
        /** Mặc định của IconButton: icon nghỉ `muted-foreground`, hover `accent` + `foreground`. */
        quiet: "bg-transparent text-muted-foreground not-disabled:hover:bg-accent not-disabled:hover:text-foreground",
        tonal: "bg-primary-soft text-primary not-disabled:hover:border-primary",
        destructive:
          "bg-destructive text-destructive-foreground not-disabled:hover:bg-[color-mix(in_srgb,var(--color-destructive)_88%,var(--color-foreground))]",
        /** Nút chữ blue không nền (chân dropdown: Bỏ chọn / Chọn tất cả; action trong toast). */
        text: "bg-transparent text-primary not-disabled:hover:bg-primary-soft disabled:text-muted-foreground",
        link: "h-auto border-0 bg-transparent px-0 text-primary underline-offset-4 not-disabled:hover:underline",
      },
      size: {
        sm: "press h-(--size-control-sm) px-2",
        md: "press h-(--size-control) px-3",
        icon: "size-(--size-control) p-0 transition-[background-color,color,transform] duration-(--duration-base) ease-out not-disabled:active:scale-92 motion-reduce:not-disabled:active:scale-100",
        "icon-sm":
          "size-(--size-control-sm) p-0 transition-[background-color,color,transform] duration-(--duration-base) ease-out not-disabled:active:scale-92 motion-reduce:not-disabled:active:scale-100",
      },
      /** IconButton đang bật (vd sidebar mở): nền `primary-soft`, icon `primary`. */
      active: { true: "", false: "" },
      state: {
        idle: "",
        loading: "cursor-progress disabled:cursor-progress disabled:opacity-80",
        success: "transition-none",
      },
    },
    compoundVariants: [
      {
        active: true,
        className: "bg-primary-soft text-primary not-disabled:hover:bg-primary-soft not-disabled:hover:text-primary",
      },
    ],
    defaultVariants: { variant: "secondary", size: "md", active: false, state: "idle" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  Omit<VariantProps<typeof buttonVariants>, "state"> & {
    asChild?: boolean;
    /** Icon Lucide đứng trước nhãn. Động tác hover tự chọn theo icon (Send tiến, Refresh quay…). */
    icon?: LucideIcon;
    iconMotion?: IconMotion;
    /** Đang ghi file / sync: khoá nút, hiện spinner, đổi nhãn sang `loadingText`. */
    loading?: boolean;
    loadingText?: React.ReactNode;
    /** Xong: icon ✓ scale-in + `successText` (~1.5s, người dùng tự tắt — xem `useFlash`). */
    success?: boolean;
    successText?: React.ReactNode;
  };

function Button({
  className,
  variant,
  size,
  active,
  asChild = false,
  icon,
  iconMotion,
  loading = false,
  loadingText,
  success = false,
  successText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const state = loading ? "loading" : success ? "success" : "idle";
  const classes = cn(buttonVariants({ variant, size, active, state }), className);

  if (asChild) {
    return (
      <Slot.Root data-slot="button" data-variant={variant} className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  let lead: React.ReactNode = null;
  let label: React.ReactNode = children;
  if (state === "loading") {
    lead = <Spinner />;
    label = loadingText ?? children;
  } else if (state === "success") {
    lead = <Icon icon={Check} className="animate-scale-in" />;
    label = successText ?? children;
  } else if (icon) {
    lead = <Icon icon={icon} motion={iconMotion ?? iconMotionFor(icon)} />;
  }

  return (
    <button
      type="button"
      data-slot="button"
      data-variant={variant}
      data-status={state}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {lead}
      {label}
    </button>
  );
}

type IconButtonProps = Omit<ButtonProps, "icon" | "children" | "size" | "loadingText" | "successText"> & {
  icon: LucideIcon;
  /** Bắt buộc: thành `aria-label` và nội dung tooltip. */
  label: string;
  size?: "icon" | "icon-sm";
  /** Tắt tooltip (vd khi nút nằm trong một tooltip khác). */
  tooltip?: boolean;
  tooltipSide?: "top" | "right" | "bottom" | "left";
};

/** Nút chỉ có icon (IconButton.md). Không dùng cho hành động phá huỷ. Là Button `size="icon"`, không phải base riêng. */
function IconButton({
  icon,
  label,
  size = "icon",
  variant = "quiet",
  active,
  tooltip = true,
  tooltipSide = "bottom",
  iconMotion,
  loading,
  ...props
}: IconButtonProps) {
  const button = (
    <Button
      variant={variant}
      size={size}
      active={active}
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      loading={loading}
      {...props}
    >
      {loading ? null : <Icon icon={icon} motion={iconMotion ?? iconMotionFor(icon)} />}
    </Button>
  );
  if (!tooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}

export { Button, IconButton, buttonVariants, type ButtonProps, type IconButtonProps };
