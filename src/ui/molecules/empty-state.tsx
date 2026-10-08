import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/ui/utils";
import { Icon } from "@/ui/primitives/icon";

/**
 * Trạng thái trống: icon trong ô `muted`, tiêu đề, mô tả một câu, hành động.
 * `size="screen"` dùng cỡ `display` 40/44 (chỉ màn trống toàn trang); `panel` cho vùng nhỏ (danh sách, log).
 */
const emptyStateVariants = cva("flex flex-col items-center text-center", {
  variants: {
    size: { panel: "gap-2 px-4 py-8", screen: "gap-4 px-6 py-16" },
  },
  defaultVariants: { size: "panel" },
});

const emptyTitleVariants = cva("m-0 font-semibold text-foreground", {
  variants: {
    size: { panel: "text-sm leading-5", screen: "text-[40px] leading-[44px] tracking-[-.02em]" },
  },
  defaultVariants: { size: "panel" },
});

type EmptyStateProps = VariantProps<typeof emptyStateVariants> & {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

function EmptyState({ icon, title, description, actions, size, className }: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className={cn(emptyStateVariants({ size }), className)}>
      {icon ? (
        <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon icon={icon} size="lg" />
        </span>
      ) : null}
      <h2 className={emptyTitleVariants({ size })}>{title}</h2>
      {description ? <p className="m-0 max-w-[420px] text-[13px] leading-[18px] text-muted-foreground">{description}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { EmptyState, emptyStateVariants, type EmptyStateProps };
