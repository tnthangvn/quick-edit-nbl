import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/**
 * Thanh tiến độ mảnh (bảng Sync Activity): rãnh `border`, phần đã chạy `primary`, có lỗi thì `destructive`.
 * `value` 0–100; bề rộng chuyển 220ms ease-out.
 */
const progressVariants = cva("relative block h-0.5 w-full overflow-hidden bg-border", {
  variants: {
    tone: { primary: "text-primary", destructive: "text-destructive" },
  },
  defaultVariants: { tone: "primary" },
});

type ProgressProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof progressVariants> & {
    value: number;
    label?: string;
  };

function Progress({ className, tone, value, label, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn(progressVariants({ tone }), className)}
      {...props}
    >
      <span className="absolute inset-y-0 left-0 bg-current transition-[width] duration-(--duration-slow) ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

export { Progress, progressVariants, type ProgressProps };
