"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/**
 * Dòng bấm được rộng hết khung, căn trái (tiêu đề khối gập/mở, một bước trong execution record).
 * Khác Button: không căn giữa, không cố định chiều cao, chữ thường; hover nền `accent`.
 * `interactive=false` khi dòng không có gì để mở (giữ cùng layout, không hover / cursor).
 */
const rowButtonVariants = cva(
  "group/row flex w-full min-w-0 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "min-h-6 px-1.5 py-0.5 text-xs leading-4",
        md: "min-h-7 px-2 py-1 text-[13px] leading-[18px]",
      },
      interactive: {
        true: "cursor-pointer transition-colors duration-(--duration-fast) ease-out hover:bg-accent",
        false: "cursor-default",
      },
    },
    defaultVariants: { size: "sm", interactive: true },
  },
);

type RowButtonProps = React.ComponentProps<"button"> & VariantProps<typeof rowButtonVariants>;

function RowButton({ className, size, interactive, type = "button", ...props }: RowButtonProps) {
  return (
    <button
      data-slot="row-button"
      type={type}
      tabIndex={interactive === false ? -1 : undefined}
      className={cn(rowButtonVariants({ size, interactive }), className)}
      {...props}
    />
  );
}

export { RowButton, rowButtonVariants, type RowButtonProps };
